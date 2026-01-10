package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
	"github.com/hisaab/backend/internal/service"
)

type GroupHandler struct{}

func NewGroupHandler() *GroupHandler {
	return &GroupHandler{}
}

func generateInviteCode() string {
	b := make([]byte, 4)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func (h *GroupHandler) CreateGroup(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	group := models.Group{
		Name:        body.Name,
		Description: body.Description,
		CreatedByID: userID,
		InviteCode:  generateInviteCode(),
	}

	if err := database.DB.Create(&group).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create group"})
	}

	// Add creator as member
	member := models.GroupMember{
		GroupID:  group.ID,
		UserID:   userID,
		JoinedAt: time.Now(),
	}
	database.DB.Create(&member)

	// Reload group with members preloaded
	database.DB.Preload("Members").First(&group, group.ID)

	// Log activity
	activity := models.Activity{
		GroupID:     group.ID,
		UserID:      userID,
		Type:        models.ActivityGroupCreated,
		Description: "created the group",
		NewValue:    group.Name,
	}
	database.DB.Create(&activity)

	return c.Status(fiber.StatusCreated).JSON(group)
}

func (h *GroupHandler) GetGroups(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var user models.User
	if err := database.DB.Preload("Groups.Members").Preload("Groups.Expenses.PaidBy").Preload("Groups.Expenses.Splits").First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	return c.JSON(user.Groups)
}

func (h *GroupHandler) GetGroupDetails(c *fiber.Ctx) error {
	groupID := c.Params("id")

	var group models.Group
	if err := database.DB.Preload("Members").Preload("Expenses").Preload("Expenses.PaidBy").Preload("Expenses.Category").First(&group, groupID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "group not found"})
	}

	return c.JSON(group)
}

func (h *GroupHandler) JoinGroupByCode(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	inviteCode := c.Params("code")

	var group models.Group
	if err := database.DB.Where("invite_code = ?", inviteCode).First(&group).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "invalid invite code"})
	}

	// Check if already a member
	var count int64
	database.DB.Model(&models.GroupMember{}).Where("group_id = ? AND user_id = ?", group.ID, userID).Count(&count)
	if count > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "already a member of this group"})
	}

	member := models.GroupMember{
		GroupID:  group.ID,
		UserID:   userID,
		JoinedAt: time.Now(),
	}
	if err := database.DB.Create(&member).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to join group"})
	}

	// Fetch fresh group data with members preloaded
	var fullGroup models.Group
	if err := database.DB.Preload("Members").First(&fullGroup, group.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch group details"})
	}

	// Log activity
	activity := models.Activity{
		GroupID:     group.ID,
		UserID:      userID,
		Type:        models.ActivityMemberJoined,
		Description: "joined the group",
	}
	database.DB.Create(&activity)

	// Get user name for notification
	var user models.User
	database.DB.First(&user, userID)

	// Send notification to group members
	go service.GetNotificationService().NotifyMemberAdded(group.ID, userID, user.Name, group.Name)

	return c.JSON(fullGroup)
}

func (h *GroupHandler) UpdateGroup(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	groupID := c.Params("id")

	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	var group models.Group
	if err := database.DB.First(&group, groupID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "group not found"})
	}

	// Check if user is a member
	var count int64
	database.DB.Model(&models.GroupMember{}).Where("group_id = ? AND user_id = ?", group.ID, userID).Count(&count)
	if count == 0 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "you are not a member of this group"})
	}

	// Store old name for activity log
	oldName := group.Name

	// Update group
	group.Name = body.Name
	group.Description = body.Description
	if err := database.DB.Save(&group).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update group"})
	}

	// Log activity if name changed
	if oldName != body.Name {
		activity := models.Activity{
			GroupID:     group.ID,
			UserID:      userID,
			Type:        models.ActivityGroupRenamed,
			Description: "renamed the group",
			OldValue:    oldName,
			NewValue:    body.Name,
		}
		database.DB.Create(&activity)
	}

	// Reload with members
	database.DB.Preload("Members").Preload("Expenses").First(&group, group.ID)

	return c.JSON(group)
}

func (h *GroupHandler) LeaveGroup(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	groupID := c.Params("id")

	var group models.Group
	if err := database.DB.Preload("Members").First(&group, groupID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "group not found"})
	}

	// Check if user is a member
	var member models.GroupMember
	if err := database.DB.Where("group_id = ? AND user_id = ?", group.ID, userID).First(&member).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "you are not a member of this group"})
	}

	isLastMember := len(group.Members) == 1

	// Check for pending settlements where user is involved (as payer or receiver)
	var pendingCount int64
	database.DB.Model(&models.Settlement{}).
		Where("group_id = ? AND status = ? AND (payer_id = ? OR receiver_id = ?)",
			group.ID, models.SettlementPending, userID, userID).
		Count(&pendingCount)

	if pendingCount > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":         "pending_settlements",
			"message":       "You have pending settlements. Please confirm or cancel them before leaving.",
			"pending_count": pendingCount,
		})
	}

	// Check outstanding balance (skip for last member - they can delete the group)
	if !isLastMember {
		balance := calculateUserBalance(group.ID, userID)
		if balance < -0.01 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "you_owe",
				"message": "You have an outstanding balance to pay. Please settle up before leaving.",
				"balance": round(abs(balance), 2),
			})
		}
		if balance > 0.01 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "owed_to_you",
				"message": "Other members owe you money. Please have them settle up before leaving.",
				"balance": round(balance, 2),
			})
		}
	}

	// If this is the last member, delete the entire group
	if isLastMember {
		// Delete all activities first
		database.DB.Where("group_id = ?", group.ID).Delete(&models.Activity{})
		// Delete all settlements
		database.DB.Where("group_id = ?", group.ID).Delete(&models.Settlement{})
		// Delete all expenses first
		database.DB.Where("group_id = ?", group.ID).Delete(&models.Expense{})
		// Delete all members
		database.DB.Where("group_id = ?", group.ID).Delete(&models.GroupMember{})
		// Delete group
		database.DB.Delete(&group)
		return c.JSON(fiber.Map{"message": "group deleted as you were the last member", "deleted": true})
	}

	// Log activity before removing member
	activity := models.Activity{
		GroupID:     group.ID,
		UserID:      userID,
		Type:        models.ActivityMemberLeft,
		Description: "left the group",
	}
	database.DB.Create(&activity)

	// Remove member
	if err := database.DB.Delete(&member).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to leave group"})
	}

	return c.JSON(fiber.Map{"message": "successfully left group", "deleted": false})
}

// CanLeaveGroup checks if user can leave a group (no pending settlements or outstanding balance)
func (h *GroupHandler) CanLeaveGroup(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	groupID := c.Params("id")

	var group models.Group
	if err := database.DB.Preload("Members").First(&group, groupID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "group not found"})
	}

	// Check if user is a member
	var memberCount int64
	database.DB.Model(&models.GroupMember{}).Where("group_id = ? AND user_id = ?", group.ID, userID).Count(&memberCount)
	if memberCount == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "you are not a member of this group"})
	}

	// Check for pending settlements
	var pendingCount int64
	database.DB.Model(&models.Settlement{}).
		Where("group_id = ? AND status = ? AND (payer_id = ? OR receiver_id = ?)",
			group.ID, models.SettlementPending, userID, userID).
		Count(&pendingCount)

	// Calculate user's outstanding balance
	balance := calculateUserBalance(group.ID, userID)

	isLastMember := len(group.Members) == 1

	// User can leave if: no pending settlements AND (balance is ~0 OR they're the last member)
	canLeave := pendingCount == 0 && (abs(balance) < 0.01 || isLastMember)

	// Determine block reason
	blockReason := ""
	if pendingCount > 0 {
		blockReason = "pending_settlements"
	} else if balance < -0.01 {
		blockReason = "you_owe" // User owes money
	} else if balance > 0.01 {
		blockReason = "owed_to_you" // Others owe user money
	}

	return c.JSON(fiber.Map{
		"can_leave":      canLeave,
		"pending_count":  pendingCount,
		"balance":        round(balance, 2),
		"block_reason":   blockReason,
		"is_last_member": isLastMember,
		"will_delete":    isLastMember,
	})
}

// calculateUserBalance calculates user's net balance in a group
// Positive = others owe user, Negative = user owes others
func calculateUserBalance(groupID uint, userID uint) float64 {
	balance := 0.0

	// Get unsettled expenses
	var expenses []models.Expense
	database.DB.Preload("Splits").
		Where("group_id = ? AND is_settled = ?", groupID, false).
		Find(&expenses)

	for _, expense := range expenses {
		// User paid - gets credit
		if expense.PaidByID == userID {
			balance += expense.Amount
		}
		// User's share - owes this amount
		for _, split := range expense.Splits {
			if split.UserID == userID {
				balance -= split.Amount
			}
		}
	}

	// Adjust for confirmed settlements
	var settlements []models.Settlement
	database.DB.Where("group_id = ? AND status = ?", groupID, models.SettlementConfirmed).Find(&settlements)

	for _, s := range settlements {
		if s.PayerID == userID {
			balance += s.Amount // User paid, reduces debt
		}
		if s.ReceiverID == userID {
			balance -= s.Amount // User received, reduces credit
		}
	}

	return balance
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

func round(x float64, decimals int) float64 {
	pow := 1.0
	for i := 0; i < decimals; i++ {
		pow *= 10
	}
	return float64(int(x*pow+0.5)) / pow
}

func (h *GroupHandler) DeleteGroup(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	groupID := c.Params("id")

	var group models.Group
	if err := database.DB.First(&group, groupID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "group not found"})
	}

	// Only creator can delete
	if group.CreatedByID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "only group creator can delete the group"})
	}

	// Delete all activities
	database.DB.Where("group_id = ?", group.ID).Delete(&models.Activity{})
	// Delete all expenses
	database.DB.Where("group_id = ?", group.ID).Delete(&models.Expense{})
	// Delete all members
	database.DB.Where("group_id = ?", group.ID).Delete(&models.GroupMember{})
	// Delete group
	database.DB.Delete(&group)

	return c.JSON(fiber.Map{"message": "group deleted successfully"})
}
