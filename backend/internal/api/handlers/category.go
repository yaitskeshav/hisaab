package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
)

type CategoryHandler struct{}

func NewCategoryHandler() *CategoryHandler {
	return &CategoryHandler{}
}

func (h *CategoryHandler) GetCategories(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var categories []models.Category
	if err := database.DB.Where("is_default = ? OR created_by = ?", true, userID).Find(&categories).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch categories"})
	}
	return c.JSON(categories)
}

func (h *CategoryHandler) CreateCategory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var body struct {
		Name string `json:"name"`
		Icon string `json:"icon"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	category := models.Category{
		Name:      body.Name,
		Icon:      body.Icon,
		CreatedBy: &userID,
		IsDefault: false,
	}

	if err := database.DB.Create(&category).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create category"})
	}

	return c.Status(fiber.StatusCreated).JSON(category)
}
