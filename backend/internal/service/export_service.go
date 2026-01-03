package service

import (
	"encoding/csv"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
	"github.com/jung-kurt/gofpdf"
	"github.com/xuri/excelize/v2"
)

// ExportService handles generating export files
type ExportService struct{}

func NewExportService() *ExportService {
	return &ExportService{}
}

// ExportData holds all data for export
type ExportData struct {
	Group       models.Group
	Expenses    []models.Expense
	Settlements []models.Settlement
	FromDate    time.Time
	ToDate      time.Time
	Members     []models.User
}

// FetchExportData retrieves all data needed for export
func (s *ExportService) FetchExportData(groupID uint, fromDate, toDate time.Time, includeSettlements bool) (*ExportData, error) {
	var group models.Group
	if err := database.DB.Preload("Members").First(&group, groupID).Error; err != nil {
		return nil, fmt.Errorf("group not found")
	}

	// Fetch expenses within date range
	var expenses []models.Expense
	query := database.DB.Where("group_id = ? AND date >= ? AND date <= ?", groupID, fromDate, toDate).
		Preload("PaidBy").
		Preload("Category").
		Preload("Splits.User").
		Order("date DESC")
	if err := query.Find(&expenses).Error; err != nil {
		return nil, err
	}

	// Fetch settlements if requested
	var settlements []models.Settlement
	if includeSettlements {
		database.DB.Where("group_id = ? AND created_at >= ? AND created_at <= ?", groupID, fromDate, toDate).
			Preload("Payer").
			Preload("Receiver").
			Find(&settlements)
	}

	// Members are already loaded via many2many
	members := group.Members

	return &ExportData{
		Group:       group,
		Expenses:    expenses,
		Settlements: settlements,
		FromDate:    fromDate,
		ToDate:      toDate,
		Members:     members,
	}, nil
}

// GenerateCSV creates a CSV file with expense and settlement data
func (s *ExportService) GenerateCSV(data *ExportData, outputPath string) error {
	file, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Header
	writer.Write([]string{
		"Date", "Type", "Title", "Amount", "Currency", "Paid By", "Category",
		"Split Type", "Split Details", "Status", "Note",
	})

	// Expenses
	for _, e := range data.Expenses {
		status := "Unsettled"
		if e.IsSettled {
			status = "Settled"
		}

		// Format split details
		var splitDetails []string
		for _, sp := range e.Splits {
			detail := fmt.Sprintf("%s: %.2f", sp.User.Name, sp.Amount)
			if sp.Percentage != nil {
				detail += fmt.Sprintf(" (%.1f%%)", *sp.Percentage)
			}
			splitDetails = append(splitDetails, detail)
		}
		splitStr := strings.Join(splitDetails, "; ")

		writer.Write([]string{
			e.Date.Format("02 January 2006"),
			"Expense",
			e.Title,
			fmt.Sprintf("%.2f", e.Amount),
			e.Currency,
			e.PaidBy.Name,
			e.Category.Name,
			e.SplitType,
			splitStr,
			status,
			"",
		})
	}

	// Settlements
	for _, s := range data.Settlements {
		writer.Write([]string{
			s.CreatedAt.Format("02 January 2006"),
			"Settlement",
			fmt.Sprintf("%s → %s", s.Payer.Name, s.Receiver.Name),
			fmt.Sprintf("%.2f", s.Amount),
			s.Currency,
			s.Payer.Name,
			"",
			"",
			s.Status,
			s.Note,
			"",
		})
	}

	return nil
}

// GenerateXLSX creates a styled XLSX file
func (s *ExportService) GenerateXLSX(data *ExportData, outputPath string) error {
	f := excelize.NewFile()
	sheet := "Expenses"
	f.SetSheetName("Sheet1", sheet)

	// Styles
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 12, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"0F4C75"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
	})

	dataStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "CCCCCC", Style: 1},
			{Type: "right", Color: "CCCCCC", Style: 1},
			{Type: "top", Color: "CCCCCC", Style: 1},
			{Type: "bottom", Color: "CCCCCC", Style: 1},
		},
	})

	amountStyle, _ := f.NewStyle(&excelize.Style{
		NumFmt:    4, // #,##0.00
		Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "CCCCCC", Style: 1},
			{Type: "right", Color: "CCCCCC", Style: 1},
			{Type: "top", Color: "CCCCCC", Style: 1},
			{Type: "bottom", Color: "CCCCCC", Style: 1},
		},
	})

	// Title row
	f.MergeCell(sheet, "A1", "J1")
	f.SetCellValue(sheet, "A1", fmt.Sprintf("%s - Expense Report", data.Group.Name))
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 16, Color: "0F4C75"},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheet, "A1", "J1", titleStyle)
	f.SetRowHeight(sheet, 1, 30)

	// Date range
	f.MergeCell(sheet, "A2", "J2")
	f.SetCellValue(sheet, "A2", fmt.Sprintf("Period: %s to %s", data.FromDate.Format("02 Jan 2006"), data.ToDate.Format("02 Jan 2006")))
	alignCenterStyle, _ := f.NewStyle(&excelize.Style{Alignment: &excelize.Alignment{Horizontal: "center"}})
	f.SetCellStyle(sheet, "A2", "J2", alignCenterStyle)
	f.SetRowHeight(sheet, 2, 20)

	// Headers
	headers := []string{"Date", "Type", "Title", "Amount", "Currency", "Paid By", "Category", "Split Type", "Split Details", "Status"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 4)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}

	// Column widths
	f.SetColWidth(sheet, "A", "A", 15) // Date
	f.SetColWidth(sheet, "B", "B", 12) // Type
	f.SetColWidth(sheet, "C", "C", 25) // Title
	f.SetColWidth(sheet, "D", "D", 12) // Amount
	f.SetColWidth(sheet, "E", "E", 10) // Currency
	f.SetColWidth(sheet, "F", "F", 18) // Paid By
	f.SetColWidth(sheet, "G", "G", 15) // Category
	f.SetColWidth(sheet, "H", "H", 12) // Split Type
	f.SetColWidth(sheet, "I", "I", 35) // Split Details
	f.SetColWidth(sheet, "J", "J", 12) // Status

	row := 5
	for _, e := range data.Expenses {
		status := "Unsettled"
		if e.IsSettled {
			status = "Settled"
		}

		// Format split details
		var splitDetails []string
		for _, sp := range e.Splits {
			detail := fmt.Sprintf("%s: %.2f", sp.User.Name, sp.Amount)
			if sp.Percentage != nil {
				detail += fmt.Sprintf(" (%.1f%%)", *sp.Percentage)
			}
			splitDetails = append(splitDetails, detail)
		}
		splitStr := strings.Join(splitDetails, "\n")

		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), e.Date.Format("02 Jan 2006"))
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), "Expense")
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), e.Title)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), e.Amount)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), e.Currency)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), e.PaidBy.Name)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), e.Category.Name)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), e.SplitType)
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), splitStr)
		f.SetCellValue(sheet, fmt.Sprintf("J%d", row), status)

		for col := 1; col <= 10; col++ {
			cell, _ := excelize.CoordinatesToCellName(col, row)
			if col == 4 { // Amount
				f.SetCellStyle(sheet, cell, cell, amountStyle)
			} else {
				f.SetCellStyle(sheet, cell, cell, dataStyle)
			}
		}
		row++
	}

	// Settlements
	for _, st := range data.Settlements {
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), st.CreatedAt.Format("02 Jan 2006"))
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), "Settlement")
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), fmt.Sprintf("%s → %s", st.Payer.Name, st.Receiver.Name))
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), st.Amount)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), st.Currency)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), st.Payer.Name)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), "-")
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), "-")
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), "-")
		f.SetCellValue(sheet, fmt.Sprintf("J%d", row), st.Status)

		for col := 1; col <= 10; col++ {
			cell, _ := excelize.CoordinatesToCellName(col, row)
			if col == 4 { // Amount
				f.SetCellStyle(sheet, cell, cell, amountStyle)
			} else {
				f.SetCellStyle(sheet, cell, cell, dataStyle)
			}
		}
		row++
	}

	// Footer
	row += 2
	f.MergeCell(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("J%d", row))
	f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Generated by Hisaab - Digital Expense Tracker")
	footerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Italic: true, Size: 10, Color: "666666"},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("J%d", row), footerStyle)

	return f.SaveAs(outputPath)
}

// GeneratePDF creates a styled PDF report using gofpdf
func (s *ExportService) GeneratePDF(data *ExportData, outputPath string) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// Colors
	primaryColor := func() { pdf.SetTextColor(15, 76, 117) } // #0F4C75
	darkColor := func() { pdf.SetTextColor(31, 41, 55) }     // #1f2937
	lightColor := func() { pdf.SetTextColor(107, 114, 128) } // #6b7280

	// Fonts
	//	pdf.AddUTF8Font("Inter", "", "fonts/Inter-Regular.ttf") // Ideally load check, fallback to Arial

	// --- Header ---
	pdf.SetFillColor(15, 76, 117)
	pdf.Rect(0, 0, 210, 45, "F")

	// Draw Hisaab Logo elements
	// Rect 1
	pdf.SetFillColor(0, 243, 209)
	pdf.RoundedRect(15, 12, 12, 2, 1, "1111", "F")
	// Rect 2
	pdf.SetFillColor(0, 153, 247)
	pdf.RoundedRect(15, 16, 12, 2, 1, "1111", "F")
	// Rect 3
	pdf.SetFillColor(0, 243, 209)
	pdf.RoundedRect(15, 20, 8, 2, 1, "1111", "F")

	// Name "hisaab"
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 20)
	pdf.Text(30, 21, "hisaab")

	// Slogan
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(173, 216, 230) // Light blue for visibility on dark background
	pdf.Text(30, 25, "Split today. Settle tomorrow.")

	// "EXPENSE REPORT" on the right
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 18)
	pdf.SetXY(140, 12)
	pdf.CellFormat(55, 10, "EXPENSE REPORT", "0", 0, "R", false, 0, "")

	// Period details
	pdf.SetFont("Arial", "", 10)
	pdf.SetXY(15, 32)
	pdf.CellFormat(0, 6, fmt.Sprintf("%s | %s to %s", data.Group.Name, data.FromDate.Format("02 Jan 2006"), data.ToDate.Format("02 Jan 2006")), "0", 0, "L", false, 0, "")
	pdf.Ln(25)

	// --- Summary Section ---
	totalExpenses := 0.0
	for _, e := range data.Expenses {
		totalExpenses += e.Amount
	}

	currentY := pdf.GetY()

	// Card 1: Total
	primaryColor()
	pdf.SetFont("Arial", "B", 10)
	pdf.Text(15, currentY, "TOTAL EXPENSES")
	pdf.SetFont("Arial", "B", 18)
	pdf.Text(15, currentY+8, fmt.Sprintf("%.2f", totalExpenses))

	// Card 2: Count
	pdf.SetFont("Arial", "B", 10)
	pdf.Text(80, currentY, "NO. OF EXPENSES")
	pdf.SetFont("Arial", "B", 18)
	pdf.Text(80, currentY+8, fmt.Sprintf("%d", len(data.Expenses)))

	// Card 3: Settlements
	pdf.SetFont("Arial", "B", 10)
	pdf.Text(145, currentY, "SETTLEMENTS")
	pdf.SetFont("Arial", "B", 18)
	pdf.Text(145, currentY+8, fmt.Sprintf("%d", len(data.Settlements)))

	pdf.Ln(20)

	// --- Expenses Table ---
	primaryColor()
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(0, 10, "Detailed Expenses")
	pdf.Ln(12)

	// Table Header
	pdf.SetFillColor(243, 244, 246) // Gray background
	pdf.SetTextColor(31, 41, 55)    // Dark text
	pdf.SetFont("Arial", "B", 10)

	// Widths: Date(18), Category(25), Title(52), PaidBy(25), Amount(35), SplitType(25)
	pdf.CellFormat(18, 10, "Date", "0", 0, "", true, 0, "")
	pdf.CellFormat(25, 10, "Category", "0", 0, "", true, 0, "")
	pdf.CellFormat(52, 10, "Title", "0", 0, "", true, 0, "")
	pdf.CellFormat(25, 10, "Paid By", "0", 0, "", true, 0, "")
	pdf.CellFormat(35, 10, "Amount", "0", 0, "R", true, 0, "")
	pdf.CellFormat(25, 10, "Split", "0", 0, "", true, 0, "")
	pdf.Ln(10)

	// Rows
	pdf.SetFont("Arial", "", 9)
	darkColor()

	fill := false
	for _, e := range data.Expenses {
		if fill {
			pdf.SetFillColor(250, 250, 250)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}

		title := e.Title
		if len(title) > 28 {
			title = title[:25] + "..."
		}

		pdf.CellFormat(18, 8, e.Date.Format("02 Jan 06"), "B", 0, "", fill, 0, "")
		pdf.CellFormat(25, 8, e.Category.Name, "B", 0, "", fill, 0, "")
		pdf.CellFormat(52, 8, title, "B", 0, "", fill, 0, "")
		pdf.CellFormat(25, 8, e.PaidBy.Name, "B", 0, "", fill, 0, "")

		// Align Amount Right
		pdf.CellFormat(35, 8, fmt.Sprintf("%.2f %s", e.Amount, e.Currency), "B", 0, "R", fill, 0, "")

		pdf.CellFormat(25, 8, e.SplitType, "B", 0, "", fill, 0, "")
		pdf.Ln(8)
		fill = !fill
	}

	// --- Settlements Table ---
	if len(data.Settlements) > 0 {
		pdf.Ln(15)
		primaryColor()
		pdf.SetFont("Arial", "B", 14)
		pdf.Cell(0, 10, "Settlements")
		pdf.Ln(12)

		// Header
		pdf.SetFillColor(243, 244, 246)
		pdf.SetTextColor(31, 41, 55)
		pdf.SetFont("Arial", "B", 10)

		pdf.CellFormat(30, 10, "Date", "0", 0, "", true, 0, "")
		pdf.CellFormat(50, 10, "Payer", "0", 0, "", true, 0, "")
		pdf.CellFormat(50, 10, "Receiver", "0", 0, "", true, 0, "")
		pdf.CellFormat(30, 10, "Amount", "0", 0, "R", true, 0, "")
		pdf.CellFormat(20, 10, "Status", "0", 0, "", true, 0, "")
		pdf.Ln(10)

		pdf.SetFont("Arial", "", 9)
		darkColor()

		fill = false
		for _, st := range data.Settlements {
			if fill {
				pdf.SetFillColor(250, 250, 250)
			} else {
				pdf.SetFillColor(255, 255, 255)
			}

			pdf.CellFormat(30, 8, st.CreatedAt.Format("02 Jan 06"), "B", 0, "", fill, 0, "")
			pdf.CellFormat(50, 8, st.Payer.Name, "B", 0, "", fill, 0, "")
			pdf.CellFormat(50, 8, st.Receiver.Name, "B", 0, "", fill, 0, "")
			pdf.CellFormat(30, 8, fmt.Sprintf("%.2f %s", st.Amount, st.Currency), "B", 0, "R", fill, 0, "")
			pdf.CellFormat(20, 8, st.Status, "B", 0, "", fill, 0, "")
			pdf.Ln(8)
			fill = !fill
		}
	}

	// Footer
	pdf.SetY(-15)
	pdf.SetFont("Arial", "I", 8)
	lightColor()
	pdf.CellFormat(0, 10, fmt.Sprintf("Generated by Hisaab - Page %d", pdf.PageNo()), "", 0, "C", false, 0, "")

	return pdf.OutputFileAndClose(outputPath)
}

// GetFileSize returns the size of a file
func GetFileSize(path string) int64 {
	info, err := os.Stat(path)
	if err != nil {
		return 0
	}
	return info.Size()
}

// EnsureExportDir ensures the exports directory exists
func EnsureExportDir() string {
	dir := "./uploads/exports"
	os.MkdirAll(dir, 0755)
	return dir
}

// GenerateSecureToken creates a secure random token
func GenerateSecureToken() string {
	return fmt.Sprintf("%d%s", time.Now().UnixNano(), filepath.Base(os.TempDir()))
}
