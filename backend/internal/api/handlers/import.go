package handlers

import (
	"encoding/csv"
	"github.com/gofiber/fiber/v2"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
	"strconv"
	"time"
)

type ImportHandler struct{}

func NewImportHandler() *ImportHandler {
	return &ImportHandler{}
}

func (h *ImportHandler) ImportSplitwiseCSV(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	groupID := c.FormValue("group_id")
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "failed to get file"})
	}

	f, _ := file.Open()
	defer f.Close()

	reader := csv.NewReader(f)
	records, err := reader.ReadAll()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to read csv"})
	}

	// Assuming 1st row is header
	for i, record := range records {
		if i == 0 {
			continue
		}

		// Very basic mapping (Splitwise format varies, this is a placeholder)
		// Date, Description, Category, Cost, Currency
		if len(record) < 4 {
			continue
		}

		date, _ := time.Parse("2006-01-02", record[0])
		title := record[1]
		cost, _ := strconv.ParseFloat(record[3], 64)
		currency := "INR"
		if len(record) > 4 {
			currency = record[4]
		}

		// Find or create category
		var cat models.Category
		database.DB.Where("name = ?", record[2]).First(&cat)
		if cat.ID == 0 {
			cat = models.Category{Name: record[2], IsDefault: true}
			database.DB.Create(&cat)
		}

		gid, _ := strconv.Atoi(groupID)
		expense := models.Expense{
			Title:      title,
			Amount:     cost,
			Currency:   currency,
			Date:       date,
			GroupID:    uint(gid),
			CategoryID: cat.ID,
			PaidByID:   userID,
			SplitType:  "EQUAL",
		}
		database.DB.Create(&expense)
	}

	return c.JSON(fiber.Map{"message": "import successful"})
}
