package handlers

import (
	"fmt"
	"math"
	"sort"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
	"github.com/hisaab/backend/internal/service"
)

type SettlementHandler struct{}

func NewSettlementHandler() *SettlementHandler {
	return &SettlementHandler{}
}

// Balance represents a user's net balance in a group
type Balance struct {
	UserID    uint        `json:"user_id"`
	User      models.User `json:"user"`
	NetAmount float64     `json:"net_amount"` // Positive = owed money, Negative = owes money
}

// Debt represents an optimized payment from one user to another
type Debt struct {
	FromUserID  uint        `json:"from_user_id"`
	FromUser    models.User `json:"from_user"`
	ToUserID    uint        `json:"to_user_id"`
	ToUser      models.User `json:"to_user"`
	Amount      float64     `json:"amount"`
	IsOptimized bool        `json:"is_optimized"` // True if this debt was simplified
}

// BalancesResponse is the API response for group balances
type BalancesResponse struct {
	Balances         []Balance `json:"balances"`
	Debts            []Debt    `json:"debts"`          // Optimized debts
	OriginalDebts    []Debt    `json:"original_debts"` // Non-optimized debts (for comparison)
	TotalOwed        float64   `json:"total_owed"`
	SettlementsSaved int       `json:"settlements_saved"` // How many settlements were saved by optimization
}

// GetGroupBalances returns optimized balances and debts for a group
func (h *SettlementHandler) GetGroupBalances(c *fiber.Ctx) error {
	groupID := c.Params("groupId")
	userID := c.Locals("user_id").(uint)

	// Verify user is member of group
	var group models.Group
	if err := database.DB.Preload("Members").First(&group, groupID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Group not found"})
	}

	isMember := false
	for _, member := range group.Members {
		if member.ID == userID {
			isMember = true
			break
		}
	}
	if !isMember {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not a member of this group"})
	}

	// Calculate balances from expenses
	balances := make(map[uint]float64)

	// Get all unsettled expenses
	var expenses []models.Expense
	database.DB.Preload("Splits").
		Where("group_id = ? AND is_settled = ?", groupID, false).
		Find(&expenses)

	for _, expense := range expenses {
		// Person who paid gets credit
		balances[expense.PaidByID] += expense.Amount

		// Each person in split owes their share
		for _, split := range expense.Splits {
			balances[split.UserID] -= split.Amount
		}
	}

	// Store raw balances before settlement adjustments
	rawBalances := make(map[uint]float64)
	for k, v := range balances {
		rawBalances[k] = v
	}

	// Adjust balances for confirmed settlements
	var settlements []models.Settlement
	database.DB.Where("group_id = ? AND status = ?", groupID, models.SettlementConfirmed).
		Find(&settlements)

	for _, settlement := range settlements {
		// Only apply settlement if payer actually had debt (negative balance)
		// This prevents deleted expenses from causing reverse debts via settlements
		payerRawBal := rawBalances[settlement.PayerID]
		receiverRawBal := rawBalances[settlement.ReceiverID]

		// Settlement only makes sense if payer owed money (negative) and receiver was owed (positive)
		if payerRawBal < -0.01 && receiverRawBal > 0.01 {
			// Cap settlement effect to not exceed the actual debt
			effectiveAmount := math.Min(settlement.Amount, math.Min(-payerRawBal, receiverRawBal))
			balances[settlement.PayerID] += effectiveAmount
			balances[settlement.ReceiverID] -= effectiveAmount
		}
	}

	// Build balance list with user details
	var balanceList []Balance
	userMap := make(map[uint]models.User)

	for _, member := range group.Members {
		userMap[member.ID] = member
		if bal, exists := balances[member.ID]; exists && math.Abs(bal) > 0.01 {
			balanceList = append(balanceList, Balance{
				UserID:    member.ID,
				User:      member,
				NetAmount: math.Round(bal*100) / 100,
			})
		}
	}

	// Calculate original (non-optimized) debts
	originalDebts := calculateOriginalDebts(balances, userMap)

	// Calculate optimized debts using min-cash-flow algorithm
	optimizedDebts := simplifyDebts(balances, userMap)

	// Calculate total owed and settlements saved
	var totalOwed float64
	for _, debt := range optimizedDebts {
		totalOwed += debt.Amount
	}
	settlementsSaved := len(originalDebts) - len(optimizedDebts)
	if settlementsSaved < 0 {
		settlementsSaved = 0
	}

	return c.JSON(BalancesResponse{
		Balances:         balanceList,
		Debts:            optimizedDebts,
		OriginalDebts:    originalDebts,
		TotalOwed:        math.Round(totalOwed*100) / 100,
		SettlementsSaved: settlementsSaved,
	})
}

// calculateOriginalDebts creates debts without optimization (each debtor pays each creditor proportionally)
func calculateOriginalDebts(balances map[uint]float64, userMap map[uint]models.User) []Debt {
	var debts []Debt

	// Separate debtors and creditors
	var debtors, creditors []struct {
		UserID uint
		Amount float64
	}

	for userID, balance := range balances {
		if balance < -0.01 {
			debtors = append(debtors, struct {
				UserID uint
				Amount float64
			}{userID, -balance})
		} else if balance > 0.01 {
			creditors = append(creditors, struct {
				UserID uint
				Amount float64
			}{userID, balance})
		}
	}

	// Create proportional debts
	for _, debtor := range debtors {
		for _, creditor := range creditors {
			// Calculate proportional amount
			totalCredit := 0.0
			for _, c := range creditors {
				totalCredit += c.Amount
			}
			amount := debtor.Amount * (creditor.Amount / totalCredit)

			if amount > 0.01 {
				debts = append(debts, Debt{
					FromUserID:  debtor.UserID,
					FromUser:    userMap[debtor.UserID],
					ToUserID:    creditor.UserID,
					ToUser:      userMap[creditor.UserID],
					Amount:      math.Round(amount*100) / 100,
					IsOptimized: false,
				})
			}
		}
	}

	return debts
}

// simplifyDebts uses a greedy min-cash-flow algorithm to minimize number of transactions
func simplifyDebts(balances map[uint]float64, userMap map[uint]models.User) []Debt {
	var debts []Debt

	// Create a copy of balances
	bal := make(map[uint]float64)
	for k, v := range balances {
		if math.Abs(v) > 0.01 {
			bal[k] = v
		}
	}

	// Get list of user IDs
	var userIDs []uint
	for id := range bal {
		userIDs = append(userIDs, id)
	}

	// Keep settling until all balances are zero
	for {
		// Find max creditor and max debtor
		var maxCreditorID, maxDebtorID uint
		maxCredit := 0.0
		maxDebt := 0.0

		for _, id := range userIDs {
			if bal[id] > maxCredit {
				maxCredit = bal[id]
				maxCreditorID = id
			}
			if bal[id] < maxDebt {
				maxDebt = bal[id]
				maxDebtorID = id
			}
		}

		// If no significant imbalance, we're done
		if maxCredit < 0.01 && maxDebt > -0.01 {
			break
		}

		// Settle the minimum of debt and credit
		settleAmount := math.Min(maxCredit, -maxDebt)

		if settleAmount > 0.01 {
			debts = append(debts, Debt{
				FromUserID:  maxDebtorID,
				FromUser:    userMap[maxDebtorID],
				ToUserID:    maxCreditorID,
				ToUser:      userMap[maxCreditorID],
				Amount:      math.Round(settleAmount*100) / 100,
				IsOptimized: true,
			})

			bal[maxCreditorID] -= settleAmount
			bal[maxDebtorID] += settleAmount
		} else {
			break
		}
	}

	// Sort debts by amount (descending)
	sort.Slice(debts, func(i, j int) bool {
		return debts[i].Amount > debts[j].Amount
	})

	return debts
}

// CreateSettlement creates a new settlement request
func (h *SettlementHandler) CreateSettlement(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var req struct {
		GroupID    uint    `json:"group_id"`
		ReceiverID uint    `json:"receiver_id"`
		Amount     float64 `json:"amount"`
		Note       string  `json:"note"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	if req.Amount <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Amount must be positive"})
	}

	if req.ReceiverID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot settle with yourself"})
	}

	// Verify user is member of group
	var group models.Group
	if err := database.DB.Preload("Members").First(&group, req.GroupID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Group not found"})
	}

	isMember := false
	isReceiverMember := false
	for _, member := range group.Members {
		if member.ID == userID {
			isMember = true
		}
		if member.ID == req.ReceiverID {
			isReceiverMember = true
		}
	}

	if !isMember {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "You are not a member of this group"})
	}
	if !isReceiverMember {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Receiver is not a member of this group"})
	}

	// Check for existing pending settlement between same users in this group
	var existingSettlement models.Settlement
	if err := database.DB.Where(
		"group_id = ? AND payer_id = ? AND receiver_id = ? AND status = ?",
		req.GroupID, userID, req.ReceiverID, models.SettlementPending,
	).First(&existingSettlement).Error; err == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "You already have a pending settlement with this person. Wait for them to confirm or reject it first.",
		})
	}

	// Calculate actual debt to validate amount
	actualDebt := h.calculateDebtBetweenUsers(req.GroupID, userID, req.ReceiverID)
	if actualDebt <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "You don't owe anything to this person",
		})
	}
	if req.Amount > actualDebt+0.01 { // Small tolerance for rounding
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":      fmt.Sprintf("Amount exceeds what you owe. Maximum: ₹%.2f", actualDebt),
			"max_amount": actualDebt,
		})
	}

	// Create settlement
	settlement := models.Settlement{
		GroupID:    req.GroupID,
		PayerID:    userID,
		ReceiverID: req.ReceiverID,
		Amount:     req.Amount,
		Note:       req.Note,
		Status:     models.SettlementPending,
	}

	if err := database.DB.Create(&settlement).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create settlement"})
	}

	// Load relations
	database.DB.Preload("Payer").Preload("Receiver").First(&settlement, settlement.ID)

	// Log activity
	database.DB.Create(&models.Activity{
		GroupID:      req.GroupID,
		UserID:       userID,
		Type:         models.ActivitySettlementCreated,
		Description:  fmt.Sprintf("%s recorded a payment of ₹%.2f to %s", settlement.Payer.Name, req.Amount, settlement.Receiver.Name),
		Amount:       &req.Amount,
		TargetUserID: &req.ReceiverID,
	})

	// Send notification to receiver
	go service.GetNotificationService().NotifySettlementCreated(req.ReceiverID, settlement.Payer.Name, req.Amount, group.Name, req.GroupID)

	return c.Status(fiber.StatusCreated).JSON(settlement)
}

// ConfirmSettlement confirms a settlement (receiver confirms payment received)
func (h *SettlementHandler) ConfirmSettlement(c *fiber.Ctx) error {
	settlementID := c.Params("id")
	userID := c.Locals("user_id").(uint)

	var settlement models.Settlement
	if err := database.DB.Preload("Payer").Preload("Receiver").First(&settlement, settlementID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Settlement not found"})
	}

	// Only receiver can confirm
	if settlement.ReceiverID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only the receiver can confirm this settlement"})
	}

	if settlement.Status != models.SettlementPending {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Settlement is not pending"})
	}

	// Update settlement
	now := time.Now()
	settlement.Status = models.SettlementConfirmed
	settlement.ConfirmedAt = &now
	database.DB.Save(&settlement)

	// Log activity
	database.DB.Create(&models.Activity{
		GroupID:      settlement.GroupID,
		UserID:       userID,
		Type:         models.ActivitySettlementConfirmed,
		Description:  fmt.Sprintf("%s confirmed receiving ₹%.2f from %s", settlement.Receiver.Name, settlement.Amount, settlement.Payer.Name),
		Amount:       &settlement.Amount,
		TargetUserID: &settlement.PayerID,
	})

	// Get group name for notification
	var group models.Group
	database.DB.First(&group, settlement.GroupID)

	// Send notification to payer that their payment was confirmed
	go service.GetNotificationService().NotifySettlementConfirmed(settlement.PayerID, settlement.Receiver.Name, settlement.Amount, group.Name, settlement.GroupID)

	return c.JSON(settlement)
}

// RejectSettlement rejects a settlement
func (h *SettlementHandler) RejectSettlement(c *fiber.Ctx) error {
	settlementID := c.Params("id")
	userID := c.Locals("user_id").(uint)

	var settlement models.Settlement
	if err := database.DB.Preload("Payer").Preload("Receiver").First(&settlement, settlementID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Settlement not found"})
	}

	// Only receiver can reject
	if settlement.ReceiverID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only the receiver can reject this settlement"})
	}

	if settlement.Status != models.SettlementPending {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Settlement is not pending"})
	}

	// Update settlement
	settlement.Status = models.SettlementRejected
	database.DB.Save(&settlement)

	// Log activity
	database.DB.Create(&models.Activity{
		GroupID:      settlement.GroupID,
		UserID:       userID,
		Type:         models.ActivitySettlementRejected,
		Description:  fmt.Sprintf("%s rejected the payment of ₹%.2f from %s", settlement.Receiver.Name, settlement.Amount, settlement.Payer.Name),
		Amount:       &settlement.Amount,
		TargetUserID: &settlement.PayerID,
	})

	return c.JSON(settlement)
}

// GetGroupSettlements returns all settlements for a group
func (h *SettlementHandler) GetGroupSettlements(c *fiber.Ctx) error {
	groupID := c.Params("groupId")
	userID := c.Locals("user_id").(uint)
	status := c.Query("status") // Optional filter: pending, confirmed, rejected

	// Verify user is member of group
	var group models.Group
	if err := database.DB.Preload("Members").First(&group, groupID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Group not found"})
	}

	isMember := false
	for _, member := range group.Members {
		if member.ID == userID {
			isMember = true
			break
		}
	}
	if !isMember {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not a member of this group"})
	}

	// Get settlements
	query := database.DB.Preload("Payer").Preload("Receiver").
		Where("group_id = ?", groupID).
		Order("created_at DESC")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	var settlements []models.Settlement
	query.Find(&settlements)

	return c.JSON(settlements)
}

// GetPendingSettlements returns settlements pending user's action (to confirm/reject)
func (h *SettlementHandler) GetPendingSettlements(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var settlements []models.Settlement
	database.DB.Preload("Payer").Preload("Receiver").Preload("Group").
		Where("receiver_id = ? AND status = ?", userID, models.SettlementPending).
		Order("created_at DESC").
		Find(&settlements)

	return c.JSON(settlements)
}

// GetUserTotalBalances returns user's total owed/owing and spending across all groups
func (h *SettlementHandler) GetUserTotalBalances(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	// Get all groups user is a member of
	var user models.User
	if err := database.DB.Preload("Groups").First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	var totalYouOwe float64
	var totalOwedToYou float64
	var totalSpent float64 // Total amount user has spent (their share in all expenses)

	for _, group := range user.Groups {
		// Calculate balances from expenses
		balances := make(map[uint]float64)

		var expenses []models.Expense
		database.DB.Preload("Splits").
			Where("group_id = ?", group.ID). // Include all expenses for spending calculation
			Find(&expenses)

		for _, expense := range expenses {
			// Track user's share (what they owe for this expense)
			for _, split := range expense.Splits {
				if split.UserID == userID {
					totalSpent += split.Amount
				}
			}

			// Only count unsettled expenses for balance calculation
			if !expense.IsSettled {
				balances[expense.PaidByID] += expense.Amount
				for _, split := range expense.Splits {
					balances[split.UserID] -= split.Amount
				}
			}
		}

		// Store raw balances before settlement adjustments
		rawBalances := make(map[uint]float64)
		for k, v := range balances {
			rawBalances[k] = v
		}

		// Adjust for confirmed settlements
		var settlements []models.Settlement
		database.DB.Where("group_id = ? AND status = ?", group.ID, models.SettlementConfirmed).
			Find(&settlements)

		for _, settlement := range settlements {
			// Only apply settlement if payer actually had debt (negative balance)
			// This prevents deleted expenses from causing reverse debts via settlements
			payerRawBal := rawBalances[settlement.PayerID]
			receiverRawBal := rawBalances[settlement.ReceiverID]

			// Settlement only makes sense if payer owed money (negative) and receiver was owed (positive)
			if payerRawBal < -0.01 && receiverRawBal > 0.01 {
				// Cap settlement effect to not exceed the actual debt
				effectiveAmount := math.Min(settlement.Amount, math.Min(-payerRawBal, receiverRawBal))
				balances[settlement.PayerID] += effectiveAmount
				balances[settlement.ReceiverID] -= effectiveAmount
			}
		}

		// User's balance in this group
		if balance, exists := balances[userID]; exists {
			if balance > 0.01 {
				totalOwedToYou += balance
			} else if balance < -0.01 {
				totalYouOwe += -balance
			}
		}
	}

	netBalance := totalOwedToYou - totalYouOwe

	return c.JSON(fiber.Map{
		"you_owe":     math.Round(totalYouOwe*100) / 100,
		"owed_to_you": math.Round(totalOwedToYou*100) / 100,
		"net_balance": math.Round(netBalance*100) / 100,
		"total_spent": math.Round(totalSpent*100) / 100,
	})
}

// calculateDebtBetweenUsers calculates how much fromUser owes toUser in a group
func (h *SettlementHandler) calculateDebtBetweenUsers(groupID uint, fromUserID uint, toUserID uint) float64 {
	// Calculate balances from expenses
	balances := make(map[uint]float64)

	// Get all unsettled expenses
	var expenses []models.Expense
	database.DB.Preload("Splits").
		Where("group_id = ? AND is_settled = ?", groupID, false).
		Find(&expenses)

	for _, expense := range expenses {
		// Person who paid gets credit
		balances[expense.PaidByID] += expense.Amount

		// Each person in split owes their share
		for _, split := range expense.Splits {
			balances[split.UserID] -= split.Amount
		}
	}

	// Store raw balances before settlement adjustments
	rawBalances := make(map[uint]float64)
	for k, v := range balances {
		rawBalances[k] = v
	}

	// Adjust for confirmed settlements
	var confirmedSettlements []models.Settlement
	database.DB.Where("group_id = ? AND status = ?", groupID, models.SettlementConfirmed).
		Find(&confirmedSettlements)

	for _, settlement := range confirmedSettlements {
		// Only apply settlement if payer actually had debt
		payerRawBal := rawBalances[settlement.PayerID]
		receiverRawBal := rawBalances[settlement.ReceiverID]

		if payerRawBal < -0.01 && receiverRawBal > 0.01 {
			effectiveAmount := math.Min(settlement.Amount, math.Min(-payerRawBal, receiverRawBal))
			balances[settlement.PayerID] += effectiveAmount
			balances[settlement.ReceiverID] -= effectiveAmount
		}
	}

	// Also account for pending settlements (to prevent over-settling)
	var pendingSettlements []models.Settlement
	database.DB.Where("group_id = ? AND payer_id = ? AND receiver_id = ? AND status = ?",
		groupID, fromUserID, toUserID, models.SettlementPending).
		Find(&pendingSettlements)

	for _, settlement := range pendingSettlements {
		// Pending settlement reduces available debt (using current balance, not raw)
		balances[settlement.PayerID] += settlement.Amount
		balances[settlement.ReceiverID] -= settlement.Amount
	}

	// Get optimized debts using simplified algorithm
	userMap := make(map[uint]models.User)
	var users []models.User
	database.DB.Where("id IN ?", []uint{fromUserID, toUserID}).Find(&users)
	for _, u := range users {
		userMap[u.ID] = u
	}

	// Use the simplified debts to find debt between these two users
	debts := simplifyDebts(balances, userMap)

	for _, debt := range debts {
		if debt.FromUserID == fromUserID && debt.ToUserID == toUserID {
			return debt.Amount
		}
	}

	return 0
}

// DeleteSettlement allows payer to cancel a pending settlement
func (h *SettlementHandler) DeleteSettlement(c *fiber.Ctx) error {
	settlementID := c.Params("id")
	userID := c.Locals("user_id").(uint)

	var settlement models.Settlement
	if err := database.DB.First(&settlement, settlementID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Settlement not found"})
	}

	// Only payer can delete pending settlement
	if settlement.PayerID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only the payer can cancel this settlement"})
	}

	if settlement.Status != models.SettlementPending {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Can only cancel pending settlements"})
	}

	database.DB.Delete(&settlement)

	return c.JSON(fiber.Map{"message": "Settlement cancelled"})
}
