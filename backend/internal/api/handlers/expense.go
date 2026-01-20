package handlers

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
	"github.com/hisaab/backend/internal/service"
)

type ExpenseHandler struct{}

func NewExpenseHandler() *ExpenseHandler {
	return &ExpenseHandler{}
}

type SplitRequest struct {
	UserID     uint     `json:"user_id"`
	Amount     float64  `json:"amount"`
	Percentage *float64 `json:"percentage,omitempty"` // For percentage-based splits
}

type CreateExpenseRequest struct {
	Title       string         `json:"title"`
	Amount      float64        `json:"amount"`
	Currency    string         `json:"currency"`
	Date        time.Time      `json:"date"`
	GroupID     uint           `json:"group_id"`
	CategoryID  uint           `json:"category_id"`
	SplitType   string         `json:"split_type"` // EQUAL, CUSTOM
	SplitMode   string         `json:"split_mode"` // AMOUNT, PERCENTAGE, SINGLE (for CUSTOM type)
	PaidByID    uint           `json:"paid_by_id"`
	ReferenceID string         `json:"reference_id"`
	AppName     string         `json:"app_name"`
	Splits      []SplitRequest `json:"splits"`
}

func (h *ExpenseHandler) CreateExpense(c *fiber.Ctx) error {
	req := new(CreateExpenseRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	if req.PaidByID == 0 {
		req.PaidByID = c.Locals("user_id").(uint)
	}

	expense := models.Expense{
		Title:       req.Title,
		Amount:      req.Amount,
		Currency:    req.Currency,
		Date:        req.Date,
		GroupID:     req.GroupID,
		CategoryID:  req.CategoryID,
		SplitType:   req.SplitType,
		SplitMode:   req.SplitMode,
		PaidByID:    req.PaidByID,
		ReferenceID: req.ReferenceID,
		AppName:     req.AppName,
	}

	if err := database.DB.Create(&expense).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create expense"})
	}

	// Handle Splits
	if req.SplitType == "EQUAL" {
		var group models.Group
		database.DB.Preload("Members").First(&group, req.GroupID)
		memberCount := len(group.Members)
		if memberCount > 0 {
			splitAmount := req.Amount / float64(memberCount)
			for _, member := range group.Members {
				split := models.ExpenseSplit{
					ExpenseID: expense.ID,
					UserID:    member.ID,
					Amount:    splitAmount,
				}
				database.DB.Create(&split)
			}
		}
	} else if req.SplitType == "CUSTOM" {
		// For custom splits, use the provided splits
		for _, s := range req.Splits {
			if s.Amount > 0 {
				split := models.ExpenseSplit{
					ExpenseID:  expense.ID,
					UserID:     s.UserID,
					Amount:     s.Amount,
					Percentage: s.Percentage,
				}
				database.DB.Create(&split)
			}
		}
	}

	// Reload with relations
	database.DB.Preload("PaidBy").Preload("Category").Preload("Splits").Preload("Splits.User").Preload("Attachments").First(&expense, expense.ID)

	// Log activity
	userID := c.Locals("user_id").(uint)
	activity := models.Activity{
		GroupID:      req.GroupID,
		UserID:       userID,
		Type:         models.ActivityExpenseAdded,
		Description:  "added an expense",
		ExpenseID:    &expense.ID,
		ExpenseTitle: expense.Title,
		Amount:       &expense.Amount,
		CategoryID:   &expense.CategoryID,
	}
	database.DB.Create(&activity)

	// Send notification to group members
	var user models.User
	database.DB.First(&user, userID)
	var group models.Group
	database.DB.First(&group, req.GroupID)
	go service.GetNotificationService().NotifyExpenseAdded(req.GroupID, userID, user.Name, expense.Title, expense.Amount, group.Name)

	return c.Status(fiber.StatusCreated).JSON(expense)
}

func (h *ExpenseHandler) SettleExpense(c *fiber.Ctx) error {
	expenseID := c.Params("id")
	userID := c.Locals("user_id").(uint)

	var expense models.Expense
	if err := database.DB.First(&expense, expenseID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "expense not found"})
	}

	wasSettled := expense.IsSettled
	expense.IsSettled = true
	database.DB.Save(&expense)

	// Log activity only if status changed
	if !wasSettled {
		activity := models.Activity{
			GroupID:      expense.GroupID,
			UserID:       userID,
			Type:         models.ActivityExpenseSettled,
			Description:  "settled an expense",
			ExpenseID:    &expense.ID,
			ExpenseTitle: expense.Title,
			Amount:       &expense.Amount,
		}
		database.DB.Create(&activity)
	}

	return c.JSON(fiber.Map{"message": "expense settled", "expense": expense})
}

func (h *ExpenseHandler) UnsettleExpense(c *fiber.Ctx) error {
	expenseID := c.Params("id")
	userID := c.Locals("user_id").(uint)

	var expense models.Expense
	if err := database.DB.First(&expense, expenseID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "expense not found"})
	}

	wasSettled := expense.IsSettled
	expense.IsSettled = false
	database.DB.Save(&expense)

	// Log activity only if status changed
	if wasSettled {
		activity := models.Activity{
			GroupID:      expense.GroupID,
			UserID:       userID,
			Type:         models.ActivityExpenseUnsettled,
			Description:  "unsettled an expense",
			ExpenseID:    &expense.ID,
			ExpenseTitle: expense.Title,
			Amount:       &expense.Amount,
		}
		database.DB.Create(&activity)
	}

	return c.JSON(fiber.Map{"message": "expense unsettled", "expense": expense})
}

func (h *ExpenseHandler) GetGroupExpenses(c *fiber.Ctx) error {
	groupID := c.Params("groupID")
	var expenses []models.Expense
	if err := database.DB.Where("group_id = ?", groupID).Preload("PaidBy").Preload("Category").Preload("Splits").Preload("Splits.User").Preload("Attachments").Find(&expenses).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch expenses"})
	}

	return c.JSON(expenses)
}

func (h *ExpenseHandler) GetExpense(c *fiber.Ctx) error {
	expenseID := c.Params("id")
	var expense models.Expense
	if err := database.DB.Preload("PaidBy").Preload("Category").Preload("Splits").Preload("Splits.User").Preload("Attachments").First(&expense, expenseID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "expense not found"})
	}

	return c.JSON(expense)
}

func (h *ExpenseHandler) UpdateExpense(c *fiber.Ctx) error {
	expenseID := c.Params("id")
	userID := c.Locals("user_id").(uint)

	req := new(CreateExpenseRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	var expense models.Expense
	if err := database.DB.Preload("Category").First(&expense, expenseID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "expense not found"})
	}

	// Store old values for activity log
	oldTitle := expense.Title
	oldAmount := expense.Amount
	oldCategoryID := expense.CategoryID
	oldCategoryName := ""
	if expense.Category.ID != 0 {
		oldCategoryName = expense.Category.Name
	}

	// Update expense fields using Updates on a fresh model to avoid GORM association interference
	updates := map[string]interface{}{
		"title":        req.Title,
		"amount":       req.Amount,
		"currency":     req.Currency,
		"date":         req.Date,
		"category_id":  req.CategoryID,
		"split_type":   req.SplitType,
		"split_mode":   req.SplitMode,
		"paid_by_id":   req.PaidByID,
		"reference_id": req.ReferenceID,
		"app_name":     req.AppName,
	}

	// Use fresh model to prevent GORM from using preloaded associations
	if err := database.DB.Model(&models.Expense{}).Where("id = ?", expenseID).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update expense"})
	}

	// Reload expense to get updated values including new category
	database.DB.Preload("Category").First(&expense, expenseID)

	// Delete old splits
	database.DB.Where("expense_id = ?", expenseID).Delete(&models.ExpenseSplit{})

	// Create new splits
	if req.SplitType == "EQUAL" {
		var group models.Group
		database.DB.Preload("Members").First(&group, expense.GroupID)
		memberCount := len(group.Members)
		if memberCount > 0 {
			splitAmount := req.Amount / float64(memberCount)
			for _, member := range group.Members {
				split := models.ExpenseSplit{
					ExpenseID: expense.ID,
					UserID:    member.ID,
					Amount:    splitAmount,
				}
				database.DB.Create(&split)
			}
		}
	} else if req.SplitType == "CUSTOM" {
		// For custom splits, use the provided splits
		for _, s := range req.Splits {
			if s.Amount > 0 {
				split := models.ExpenseSplit{
					ExpenseID:  expense.ID,
					UserID:     s.UserID,
					Amount:     s.Amount,
					Percentage: s.Percentage,
				}
				database.DB.Create(&split)
			}
		}
	}

	// Reload with relations
	database.DB.Preload("PaidBy").Preload("Category").Preload("Splits").Preload("Splits.User").Preload("Attachments").First(&expense, expenseID)

	// Log activity with detailed changes
	activity := models.Activity{
		GroupID:      expense.GroupID,
		UserID:       userID,
		Type:         models.ActivityExpenseEdited,
		ExpenseID:    &expense.ID,
		ExpenseTitle: expense.Title,
		Amount:       &expense.Amount,
		CategoryID:   &expense.CategoryID,
	}

	// Build description based on what changed (pipe-separated for multiple changes)
	changeParts := []string{}

	if oldTitle != expense.Title {
		changeParts = append(changeParts, fmt.Sprintf("title_changed:%s:%s", oldTitle, expense.Title))
	}
	if oldAmount != expense.Amount {
		changeParts = append(changeParts, fmt.Sprintf("amount_changed:%.2f:%.2f", oldAmount, expense.Amount))
	}
	if oldCategoryID != expense.CategoryID {
		newCategoryName := expense.Category.Name
		changeParts = append(changeParts, fmt.Sprintf("category_changed:%s:%s", oldCategoryName, newCategoryName))
	}

	if len(changeParts) > 0 {
		activity.Description = strings.Join(changeParts, "|")
	} else {
		activity.Description = "edited an expense"
	}

	database.DB.Create(&activity)

	// Send notification to group members
	var user models.User
	database.DB.First(&user, userID)
	var group models.Group
	database.DB.First(&group, expense.GroupID)

	// Build human-readable changes for notification
	changes := ""
	if oldAmount != expense.Amount {
		changes = fmt.Sprintf("₹%.0f → ₹%.0f", oldAmount, expense.Amount)
	} else if oldTitle != expense.Title {
		changes = fmt.Sprintf("renamed to \"%s\"", expense.Title)
	}
	go service.GetNotificationService().NotifyExpenseEdited(expense.GroupID, userID, user.Name, expense.Title, changes, group.Name)

	return c.JSON(expense)
}

func (h *ExpenseHandler) DeleteExpense(c *fiber.Ctx) error {
	expenseID := c.Params("id")
	userID := c.Locals("user_id").(uint)

	// Get the expense first to log the activity
	var expense models.Expense
	if err := database.DB.First(&expense, expenseID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "expense not found"})
	}

	// Store expense info for activity log
	groupID := expense.GroupID
	expenseTitle := expense.Title
	expenseAmount := expense.Amount

	// Get attachments to delete files
	var attachments []models.Attachment
	database.DB.Where("expense_id = ?", expenseID).Find(&attachments)

	// Delete attachment files
	for _, att := range attachments {
		os.Remove("." + att.FilePath) // FilePath is like /uploads/xxx, prepend . for relative path
	}

	// Delete attachments from DB
	database.DB.Where("expense_id = ?", expenseID).Delete(&models.Attachment{})

	// Delete splits
	database.DB.Where("expense_id = ?", expenseID).Delete(&models.ExpenseSplit{})

	// Delete expense
	if err := database.DB.Delete(&models.Expense{}, expenseID).Error; err != nil {
	}

	// Log activity after successful deletion
	activity := models.Activity{
		GroupID:      groupID,
		UserID:       userID,
		Type:         models.ActivityExpenseDeleted,
		Description:  "deleted an expense",
		ExpenseTitle: expenseTitle,
		Amount:       &expenseAmount,
	}
	database.DB.Create(&activity)

	return c.SendStatus(fiber.StatusNoContent)
}
