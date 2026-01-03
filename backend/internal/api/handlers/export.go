package handlers

import (
	"crypto/rand"
	"encoding/csv"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
	"github.com/hisaab/backend/internal/service"
	"github.com/hisaab/backend/internal/utils"
	"github.com/xuri/excelize/v2"
)

type ExportHandler struct {
	exportService *service.ExportService
}

func NewExportHandler() *ExportHandler {
	return &ExportHandler{
		exportService: service.NewExportService(),
	}
}

// ExportRequest represents the request body for export
type ExportRequest struct {
	GroupID            uint   `json:"group_id"`
	Format             string `json:"format"` // pdf, csv, xlsx
	FromDate           string `json:"from_date"`
	ToDate             string `json:"to_date"`
	IncludeSettlements bool   `json:"include_settlements"`
}

// RequestExport handles the export request
func (h *ExportHandler) RequestExport(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var req ExportRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate format
	if req.Format != "pdf" && req.Format != "csv" && req.Format != "xlsx" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid format. Use pdf, csv, or xlsx"})
	}

	// Parse dates
	fromDate, err := time.Parse("2006-01-02", req.FromDate)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid from_date format. Use YYYY-MM-DD"})
	}
	toDate, err := time.Parse("2006-01-02", req.ToDate)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid to_date format. Use YYYY-MM-DD"})
	}
	// Set end of day for toDate
	toDate = toDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)

	// Validate user is member of group
	var membership models.GroupMember
	if err := database.DB.Where("group_id = ? AND user_id = ?", req.GroupID, userID).First(&membership).Error; err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "You are not a member of this group"})
	}

	// Fetch user email
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch user"})
	}

	// Fetch export data
	data, err := h.exportService.FetchExportData(req.GroupID, fromDate, toDate, req.IncludeSettlements)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Generate secure token
	token := generateSecureToken()

	// Ensure export directory exists
	exportDir := "./uploads/exports"
	os.MkdirAll(exportDir, 0755)

	// Generate filename
	filename := fmt.Sprintf("%s_%s_%d.%s", data.Group.Name, token[:8], time.Now().Unix(), req.Format)
	filePath := filepath.Join(exportDir, filename)

	// Generate file based on format
	switch req.Format {
	case "csv":
		if err := h.exportService.GenerateCSV(data, filePath); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate CSV"})
		}
	case "xlsx":
		if err := h.exportService.GenerateXLSX(data, filePath); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate XLSX"})
		}
	case "pdf":
		if err := h.exportService.GeneratePDF(data, filePath); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate PDF"})
		}
	}

	// Get file size
	fileInfo, _ := os.Stat(filePath)
	fileSize := fileInfo.Size()

	// Create export token record
	exportToken := models.ExportToken{
		UserID:    userID,
		GroupID:   req.GroupID,
		Token:     token,
		FilePath:  filePath,
		FileName:  filename,
		Format:    req.Format,
		FileSize:  fileSize,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	if err := database.DB.Create(&exportToken).Error; err != nil {
		os.Remove(filePath) // Clean up
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create export token"})
	}

	// Generate download URL
	baseURL := os.Getenv("BACKEND_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	downloadURL := fmt.Sprintf("%s/api/v1/downloads/%s", baseURL, token)

	// Generate email HTML
	emailHTML := generateExportEmailHTML(data.Group.Name, req.Format, downloadURL, fromDate, toDate)

	// Send email and notification in background
	go func() {
		attachmentName := fmt.Sprintf("Hisaab_%s_Export.%s", data.Group.Name, req.Format)
		if err := utils.SendEmailWithAttachment(user.Email, fmt.Sprintf("Your %s Export is Ready - %s", data.Group.Name, req.Format), emailHTML, filePath, attachmentName); err != nil {
			log.Printf("Failed to send export email: %v", err)
			return
		}

		// Send push notification
		notificationService := service.GetNotificationService()
		title := "Export Ready"
		body := fmt.Sprintf("Your %s export for group \"%s\" has been sent to your email.", strings.ToUpper(req.Format), data.Group.Name)
		data := map[string]string{
			"type":     "export_ready",
			"format":   req.Format,
			"group_id": fmt.Sprintf("%d", req.GroupID),
		}
		if err := notificationService.SendToUser(user.ID, title, body, data); err != nil {
			log.Printf("Failed to send export notification: %v", err)
		}
	}()

	return c.JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("Export is being generated and will be sent to %s", user.Email),
	})
}

// DownloadExport handles secure file download
func (h *ExportHandler) DownloadExport(c *fiber.Ctx) error {
	token := c.Params("token")

	var exportToken models.ExportToken
	if err := database.DB.Where("token = ?", token).First(&exportToken).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Invalid or expired download link"})
	}

	// Check expiry
	if time.Now().After(exportToken.ExpiresAt) {
		return c.Status(fiber.StatusGone).JSON(fiber.Map{"error": "Download link has expired"})
	}

	// Check file exists
	if _, err := os.Stat(exportToken.FilePath); os.IsNotExist(err) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "File not found"})
	}

	// Set headers for download
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", exportToken.FileName))
	c.Set("Content-Type", getExportContentType(exportToken.Format))

	return c.SendFile(exportToken.FilePath)
}

// Legacy handlers (kept for backward compatibility)
func (h *ExportHandler) ExportCSV(c *fiber.Ctx) error {
	groupID := c.Params("groupID")
	var expenses []models.Expense
	database.DB.Where("group_id = ?", groupID).Preload("PaidBy").Preload("Category").Find(&expenses)

	filename := fmt.Sprintf("export_%s_%d.csv", groupID, time.Now().Unix())
	filepath := filepath.Join("./uploads", filename)

	file, err := os.Create(filepath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create file"})
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Header
	writer.Write([]string{"Date", "Title", "Amount", "Currency", "Paid By", "Category", "Status"})

	for _, e := range expenses {
		status := "Unsettled"
		if e.IsSettled {
			status = "Settled"
		}
		writer.Write([]string{
			e.Date.Format("2006-01-02"),
			e.Title,
			fmt.Sprintf("%.2f", e.Amount),
			e.Currency,
			e.PaidBy.Name,
			e.Category.Name,
			status,
		})
	}

	return c.JSON(fiber.Map{"url": "/uploads/" + filename})
}

func (h *ExportHandler) ExportXLSX(c *fiber.Ctx) error {
	groupID := c.Params("groupID")
	var expenses []models.Expense
	database.DB.Where("group_id = ?", groupID).Preload("PaidBy").Preload("Category").Find(&expenses)

	f := excelize.NewFile()
	sheet := "Expenses"
	index, _ := f.NewSheet(sheet)
	f.SetActiveSheet(index)

	// Set headers
	headers := []string{"Date", "Title", "Amount", "Currency", "Paid By", "Category", "Status"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	for i, e := range expenses {
		row := i + 2
		status := "Unsettled"
		if e.IsSettled {
			status = "Settled"
		}
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), e.Date.Format("2006-01-02"))
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), e.Title)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), e.Amount)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), e.Currency)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), e.PaidBy.Name)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), e.Category.Name)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), status)
	}

	filename := fmt.Sprintf("export_%s_%d.xlsx", groupID, time.Now().Unix())
	path := filepath.Join("./uploads", filename)
	if err := f.SaveAs(path); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save xlsx"})
	}

	return c.JSON(fiber.Map{"url": "/uploads/" + filename})
}

// Helper functions
func generateSecureToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func getExportContentType(format string) string {
	switch format {
	case "pdf":
		return "application/pdf"
	case "csv":
		return "text/csv"
	case "xlsx":
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	default:
		return "application/octet-stream"
	}
}

func generateExportEmailHTML(groupName, format, downloadURL string, fromDate, toDate time.Time) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f4f5;">
	<table width="100%%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
		<tr>
			<td style="background:linear-gradient(135deg,#0F4C75 0%%,#3282B8 100%%);padding:40px 30px;text-align:center;">
				<h1 style="color:#ffffff;margin:0;font-size:28px;">📊 Your Export is Ready!</h1>
			</td>
		</tr>
		<tr>
			<td style="padding:40px 30px;">
				<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px;">
					Hi there! 👋
				</p>
				<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px;">
					Your <strong>%s</strong> export for <strong>%s</strong> is ready to download.
				</p>
				<table width="100%%" style="background:#f3f4f6;border-radius:8px;padding:20px;margin:20px 0;">
					<tr>
						<td>
							<p style="margin:0 0 8px;color:#6b7280;font-size:14px;">📅 Date Range</p>
							<p style="margin:0;color:#1f2937;font-weight:600;">%s to %s</p>
						</td>
					</tr>
				</table>
				<table width="100%%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
					<tr>
						<td align="center">
							<a href="%s" style="display:inline-block;background:#0F4C75;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;font-size:16px;">
								⬇️ Download %s
							</a>
						</td>
					</tr>
				</table>
				<p style="color:#ef4444;font-size:14px;text-align:center;margin:20px 0;">
					⚠️ This link is valid for <strong>24 hours only</strong>.
				</p>
				<hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;">
				<p style="color:#6b7280;font-size:14px;margin:0;">
					If the button doesn't work, copy and paste this link in your browser:<br>
					<a href="%s" style="color:#0F4C75;word-break:break-all;">%s</a>
				</p>
			</td>
		</tr>
		<tr>
			<td style="background:#f9fafb;padding:30px;text-align:center;">
				<p style="color:#9ca3af;font-size:12px;margin:0 0 10px;">
					Sent by <strong>Hisaab</strong> - Digital Expense Tracker
				</p>
				<p style="color:#9ca3af;font-size:12px;margin:0;">
					© 2026 Hisaab. All rights reserved.
				</p>
			</td>
		</tr>
	</table>
</body>
</html>
	`, strings.ToUpper(format), groupName, fromDate.Format("02 Jan 2006"), toDate.Format("02 Jan 2006"), downloadURL, strings.ToUpper(format), downloadURL, downloadURL)
}
