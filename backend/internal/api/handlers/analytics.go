package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
)

type AnalyticsHandler struct{}

func NewAnalyticsHandler() *AnalyticsHandler {
	return &AnalyticsHandler{}
}

func (h *AnalyticsHandler) GetGroupAnalytics(c *fiber.Ctx) error {
	groupID := c.Params("groupID")

	var expenses []models.Expense
	database.DB.Where("group_id = ?", groupID).Preload("Splits").Preload("Category").Preload("PaidBy").Find(&expenses)

	// 1. Expense by Person (Bar Chart)
	personExpenses := make(map[string]float64)
	for _, e := range expenses {
		personExpenses[e.PaidBy.Name] += e.Amount
	}

	// 2. Category Share (Pie Chart)
	categoryShare := make(map[string]float64)
	for _, e := range expenses {
		categoryShare[e.Category.Name] += e.Amount
	}

	// 3. Who Owes Who Matrix
	// This is more complex. Let's calculate net balances for each user in the group.
	balances := make(map[uint]float64) // userID -> balance (positive means they are owed, negative means they owe)

	for _, e := range expenses {
		if e.IsSettled {
			continue
		}
		// Paid by someone
		balances[e.PaidByID] += e.Amount
		// Split among members
		for _, s := range e.Splits {
			balances[s.UserID] -= s.Amount
		}
	}

	return c.JSON(fiber.Map{
		"person_expenses": personExpenses,
		"category_share":  categoryShare,
		"balances":        balances,
	})
}
