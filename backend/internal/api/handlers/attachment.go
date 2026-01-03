package handlers

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
)

type AttachmentHandler struct{}

func NewAttachmentHandler() *AttachmentHandler {
	return &AttachmentHandler{}
}

func (h *AttachmentHandler) UploadAttachment(c *fiber.Ctx) error {
	expenseID := c.FormValue("expense_id")
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "failed to get file"})
	}

	uniqueID := uuid.New().String()
	filename := fmt.Sprintf("%s_%s", uniqueID, file.Filename)
	savePath := filepath.Join("./uploads", filename)

	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save file"})
	}

	attachment := models.Attachment{
		FileName: file.Filename,
		FilePath: "/uploads/" + filename,
		FileType: filepath.Ext(file.Filename),
	}

	// If expenseID is provided, link it
	if expenseID != "" {
		var eid uint
		fmt.Sscanf(expenseID, "%d", &eid)
		attachment.ExpenseID = eid
	}

	if err := database.DB.Create(&attachment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save attachment metadata"})
	}

	return c.Status(fiber.StatusCreated).JSON(attachment)
}

func (h *AttachmentHandler) DeleteAttachment(c *fiber.Ctx) error {
	attachmentID := c.Params("id")
	userID := c.Locals("user_id").(uint)

	var attachment models.Attachment
	if err := database.DB.First(&attachment, attachmentID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "attachment not found"})
	}

	// Verify user is member of the expense's group
	var expense models.Expense
	if err := database.DB.First(&expense, attachment.ExpenseID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "expense not found"})
	}

	if !isUserGroupMember(userID, expense.GroupID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "access denied"})
	}

	// Delete file
	os.Remove("." + attachment.FilePath)

	// Delete from DB
	if err := database.DB.Delete(&attachment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete attachment"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *AttachmentHandler) DownloadAttachment(c *fiber.Ctx) error {
	attachmentID := c.Params("id")
	userID := c.Locals("user_id").(uint)

	var attachment models.Attachment
	if err := database.DB.First(&attachment, attachmentID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "attachment not found"})
	}

	// Verify user is member of the expense's group
	var expense models.Expense
	if err := database.DB.First(&expense, attachment.ExpenseID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "expense not found"})
	}

	if !isUserGroupMember(userID, expense.GroupID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "access denied"})
	}

	filePath := "." + attachment.FilePath

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "file not found"})
	}

	// Set content type based on file extension
	contentType := getContentType(attachment.FileType)
	c.Set("Content-Type", contentType)
	c.Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", attachment.FileName))

	return c.SendFile(filePath)
}

func isUserGroupMember(userID uint, groupID uint) bool {
	var group models.Group
	if err := database.DB.Preload("Members").First(&group, groupID).Error; err != nil {
		return false
	}
	for _, member := range group.Members {
		if member.ID == userID {
			return true
		}
	}
	return false
}

func getContentType(fileType string) string {
	switch fileType {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".pdf":
		return "application/pdf"
	case ".doc":
		return "application/msword"
	case ".docx":
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	case ".xls":
		return "application/vnd.ms-excel"
	case ".xlsx":
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case ".mp4":
		return "video/mp4"
	default:
		return "application/octet-stream"
	}
}
