package handlers

import (
	"sort"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
)

type AnalyticsHandler struct{}

func NewAnalyticsHandler() *AnalyticsHandler {
	return &AnalyticsHandler{}
}

// getDateFilter returns start date based on period
func getDateFilter(period string) *time.Time {
	now := time.Now()
	var start time.Time

	switch period {
	case "week":
		start = now.AddDate(0, 0, -7)
	case "month":
		start = now.AddDate(0, -1, 0)
	default: // "all"
		return nil
	}
	return &start
}

// GetGroupAnalytics returns analytics for a group based on section and period
func (h *AnalyticsHandler) GetGroupAnalytics(c *fiber.Ctx) error {
	groupID := c.Params("groupID")
	section := c.Query("section", "overview")
	period := c.Query("period", "all")
	userID := c.Locals("user_id").(uint)

	startDate := getDateFilter(period)

	switch section {
	case "overview":
		return h.getOverview(c, groupID, startDate)
	case "categories":
		return h.getCategories(c, groupID, startDate)
	case "members":
		return h.getMembers(c, groupID, startDate)
	case "trends":
		return h.getTrends(c, groupID, period)
	case "personal":
		return h.getPersonal(c, groupID, startDate, userID)
	case "settlements":
		return h.getSettlements(c, groupID, startDate)
	default:
		return h.getOverview(c, groupID, startDate)
	}
}

// getOverview returns summary stats
func (h *AnalyticsHandler) getOverview(c *fiber.Ctx, groupID string, startDate *time.Time) error {
	var expenses []models.Expense
	query := database.DB.Where("group_id = ?", groupID).Preload("Category").Preload("PaidBy")

	if startDate != nil {
		query = query.Where("date >= ?", startDate)
	}
	query.Find(&expenses)

	if len(expenses) == 0 {
		return c.JSON(fiber.Map{
			"total_spent":        0,
			"expense_count":      0,
			"average_expense":    0,
			"highest_expense":    nil,
			"most_used_category": nil,
			"date_range":         nil,
		})
	}

	// Calculate totals
	var totalSpent float64
	var highestExpense models.Expense
	categoryCount := make(map[uint]int)
	var firstDate, lastDate time.Time

	for i, e := range expenses {
		totalSpent += e.Amount

		if e.Amount > highestExpense.Amount {
			highestExpense = e
		}

		categoryCount[e.CategoryID]++

		if i == 0 {
			firstDate = e.Date
			lastDate = e.Date
		} else {
			if e.Date.Before(firstDate) {
				firstDate = e.Date
			}
			if e.Date.After(lastDate) {
				lastDate = e.Date
			}
		}
	}

	// Find most used category
	var mostUsedCategoryID uint
	var maxCount int
	for catID, count := range categoryCount {
		if count > maxCount {
			maxCount = count
			mostUsedCategoryID = catID
		}
	}

	var mostUsedCategory *models.Category
	if mostUsedCategoryID > 0 {
		var cat models.Category
		database.DB.First(&cat, mostUsedCategoryID)
		mostUsedCategory = &cat
	}

	avgExpense := totalSpent / float64(len(expenses))

	return c.JSON(fiber.Map{
		"total_spent":     totalSpent,
		"expense_count":   len(expenses),
		"average_expense": avgExpense,
		"highest_expense": fiber.Map{
			"id":     highestExpense.ID,
			"title":  highestExpense.Title,
			"amount": highestExpense.Amount,
			"date":   highestExpense.Date,
		},
		"most_used_category": fiber.Map{
			"id":    mostUsedCategory.ID,
			"name":  mostUsedCategory.Name,
			"icon":  mostUsedCategory.Icon,
			"count": maxCount,
		},
		"date_range": fiber.Map{
			"first": firstDate,
			"last":  lastDate,
		},
	})
}

// getCategories returns spending by category
func (h *AnalyticsHandler) getCategories(c *fiber.Ctx, groupID string, startDate *time.Time) error {
	var expenses []models.Expense
	query := database.DB.Where("group_id = ?", groupID).Preload("Category")

	if startDate != nil {
		query = query.Where("date >= ?", startDate)
	}
	query.Find(&expenses)

	// Calculate totals per category
	categoryAmounts := make(map[uint]float64)
	categoryCounts := make(map[uint]int)
	categoryMap := make(map[uint]models.Category)
	var totalSpent float64

	for _, e := range expenses {
		categoryAmounts[e.CategoryID] += e.Amount
		categoryCounts[e.CategoryID]++
		categoryMap[e.CategoryID] = e.Category
		totalSpent += e.Amount
	}

	// Build response
	type CategoryStat struct {
		ID         uint    `json:"id"`
		Name       string  `json:"name"`
		Icon       string  `json:"icon"`
		Amount     float64 `json:"amount"`
		Percentage float64 `json:"percentage"`
		Count      int     `json:"count"`
	}

	var categories []CategoryStat
	for catID, amount := range categoryAmounts {
		cat := categoryMap[catID]
		percentage := 0.0
		if totalSpent > 0 {
			percentage = (amount / totalSpent) * 100
		}
		categories = append(categories, CategoryStat{
			ID:         cat.ID,
			Name:       cat.Name,
			Icon:       cat.Icon,
			Amount:     amount,
			Percentage: percentage,
			Count:      categoryCounts[catID],
		})
	}

	// Sort by amount descending
	sort.Slice(categories, func(i, j int) bool {
		return categories[i].Amount > categories[j].Amount
	})

	return c.JSON(fiber.Map{
		"categories":  categories,
		"total_spent": totalSpent,
	})
}

// getMembers returns spending by member
func (h *AnalyticsHandler) getMembers(c *fiber.Ctx, groupID string, startDate *time.Time) error {
	var expenses []models.Expense
	query := database.DB.Where("group_id = ?", groupID).Preload("PaidBy")

	if startDate != nil {
		query = query.Where("date >= ?", startDate)
	}
	query.Find(&expenses)

	// Calculate totals per member
	memberAmounts := make(map[uint]float64)
	memberCounts := make(map[uint]int)
	memberMap := make(map[uint]models.User)
	var totalSpent float64

	for _, e := range expenses {
		memberAmounts[e.PaidByID] += e.Amount
		memberCounts[e.PaidByID]++
		memberMap[e.PaidByID] = e.PaidBy
		totalSpent += e.Amount
	}

	// Build response
	type MemberStat struct {
		ID         uint    `json:"id"`
		Name       string  `json:"name"`
		Avatar     string  `json:"avatar"`
		Paid       float64 `json:"paid"`
		Percentage float64 `json:"percentage"`
		Count      int     `json:"count"`
	}

	var members []MemberStat
	var topSpender MemberStat

	for memberID, amount := range memberAmounts {
		member := memberMap[memberID]
		percentage := 0.0
		if totalSpent > 0 {
			percentage = (amount / totalSpent) * 100
		}
		stat := MemberStat{
			ID:         member.ID,
			Name:       member.Name,
			Avatar:     member.AvatarURL,
			Paid:       amount,
			Percentage: percentage,
			Count:      memberCounts[memberID],
		}
		members = append(members, stat)

		if amount > topSpender.Paid {
			topSpender = stat
		}
	}

	// Sort by amount descending
	sort.Slice(members, func(i, j int) bool {
		return members[i].Paid > members[j].Paid
	})

	return c.JSON(fiber.Map{
		"members":     members,
		"top_spender": topSpender,
		"total_spent": totalSpent,
	})
}

// getTrends returns time-based spending data
func (h *AnalyticsHandler) getTrends(c *fiber.Ctx, groupID string, period string) error {
	var expenses []models.Expense

	// For trends, we need more data for context
	var startDate time.Time
	now := time.Now()

	switch period {
	case "week":
		startDate = now.AddDate(0, 0, -7)
	case "month":
		startDate = now.AddDate(0, -1, 0)
	default:
		// For "all", get last 6 months
		startDate = now.AddDate(0, -6, 0)
	}

	database.DB.Where("group_id = ? AND date >= ?", groupID, startDate).
		Order("date ASC").
		Find(&expenses)

	// Daily data (for week view)
	dailyData := make(map[string]float64)
	// Weekly data
	weeklyData := make(map[string]float64)
	// Monthly data
	monthlyData := make(map[string]float64)

	for _, e := range expenses {
		// Daily
		dayKey := e.Date.Format("2006-01-02")
		dailyData[dayKey] += e.Amount

		// Weekly (week number)
		year, week := e.Date.ISOWeek()
		weekKey := e.Date.Format("Jan") + " W" + string(rune('0'+week%10))
		if week >= 10 {
			weekKey = e.Date.Format("Jan") + " W" + string(rune('0'+week/10)) + string(rune('0'+week%10))
		}
		_ = year
		weeklyData[weekKey] += e.Amount

		// Monthly
		monthKey := e.Date.Format("Jan 2006")
		monthlyData[monthKey] += e.Amount
	}

	// Convert maps to sorted arrays
	type DataPoint struct {
		Label  string  `json:"label"`
		Amount float64 `json:"amount"`
	}

	// Daily - last 7 days
	var daily []DataPoint
	for i := 6; i >= 0; i-- {
		date := now.AddDate(0, 0, -i)
		key := date.Format("2006-01-02")
		label := date.Format("Mon")
		daily = append(daily, DataPoint{Label: label, Amount: dailyData[key]})
	}

	// Monthly - last 6 months
	var monthly []DataPoint
	for i := 5; i >= 0; i-- {
		date := now.AddDate(0, -i, 0)
		key := date.Format("Jan 2006")
		label := date.Format("Jan")
		monthly = append(monthly, DataPoint{Label: label, Amount: monthlyData[key]})
	}

	return c.JSON(fiber.Map{
		"daily":   daily,
		"monthly": monthly,
	})
}

// getPersonal returns stats for the logged-in user
func (h *AnalyticsHandler) getPersonal(c *fiber.Ctx, groupID string, startDate *time.Time, userID uint) error {
	var expenses []models.Expense
	query := database.DB.Where("group_id = ?", groupID).Preload("Splits").Preload("Category")

	if startDate != nil {
		query = query.Where("date >= ?", startDate)
	}
	query.Find(&expenses)

	var yourContribution float64 // What you paid
	var yourShare float64        // What you owe (your splits)
	var totalGroupSpent float64
	yourCategoryAmounts := make(map[uint]float64)
	categoryMap := make(map[uint]models.Category)
	memberCount := make(map[uint]bool)

	for _, e := range expenses {
		totalGroupSpent += e.Amount

		// Track unique members
		memberCount[e.PaidByID] = true
		for _, s := range e.Splits {
			memberCount[s.UserID] = true
		}

		// Your contribution (what you paid)
		if e.PaidByID == userID {
			yourContribution += e.Amount
		}

		// Your share (what you owe)
		for _, s := range e.Splits {
			if s.UserID == userID {
				yourShare += s.Amount
				yourCategoryAmounts[e.CategoryID] += s.Amount
				categoryMap[e.CategoryID] = e.Category
			}
		}
	}

	// Your top categories
	type CategoryAmount struct {
		ID     uint    `json:"id"`
		Name   string  `json:"name"`
		Icon   string  `json:"icon"`
		Amount float64 `json:"amount"`
	}

	var yourTopCategories []CategoryAmount
	for catID, amount := range yourCategoryAmounts {
		cat := categoryMap[catID]
		yourTopCategories = append(yourTopCategories, CategoryAmount{
			ID:     cat.ID,
			Name:   cat.Name,
			Icon:   cat.Icon,
			Amount: amount,
		})
	}

	// Sort by amount descending
	sort.Slice(yourTopCategories, func(i, j int) bool {
		return yourTopCategories[i].Amount > yourTopCategories[j].Amount
	})

	// Limit to top 5
	if len(yourTopCategories) > 5 {
		yourTopCategories = yourTopCategories[:5]
	}

	// Calculate group average
	groupAvg := 0.0
	if len(memberCount) > 0 {
		groupAvg = totalGroupSpent / float64(len(memberCount))
	}

	netBalance := yourContribution - yourShare

	return c.JSON(fiber.Map{
		"your_contribution":   yourContribution,
		"your_share":          yourShare,
		"net_balance":         netBalance,
		"your_top_categories": yourTopCategories,
		"you_vs_average": fiber.Map{
			"you":       yourContribution,
			"group_avg": groupAvg,
		},
		"total_group_spent": totalGroupSpent,
	})
}

// getSettlements returns settlement summary
func (h *AnalyticsHandler) getSettlements(c *fiber.Ctx, groupID string, startDate *time.Time) error {
	var settlements []models.Settlement
	query := database.DB.Where("group_id = ?", groupID).Preload("Payer").Preload("Receiver")

	if startDate != nil {
		query = query.Where("created_at >= ?", startDate)
	}
	query.Find(&settlements)

	var totalSettled float64
	var pendingCount int
	var pendingAmount float64

	for _, s := range settlements {
		if s.Status == models.SettlementConfirmed {
			totalSettled += s.Amount
		} else if s.Status == models.SettlementPending {
			pendingCount++
			pendingAmount += s.Amount
		}
	}

	// Get simplified debts (current balances)
	var expenses []models.Expense
	database.DB.Where("group_id = ? AND is_settled = ?", groupID, false).
		Preload("Splits").Preload("PaidBy").Find(&expenses)

	// Calculate net balances
	balances := make(map[uint]float64)
	userMap := make(map[uint]models.User)

	for _, e := range expenses {
		balances[e.PaidByID] += e.Amount
		userMap[e.PaidByID] = e.PaidBy

		for _, s := range e.Splits {
			balances[s.UserID] -= s.Amount
			if _, ok := userMap[s.UserID]; !ok {
				var user models.User
				database.DB.First(&user, s.UserID)
				userMap[s.UserID] = user
			}
		}
	}

	// Subtract confirmed settlements
	var confirmedSettlements []models.Settlement
	database.DB.Where("group_id = ? AND status = ?", groupID, models.SettlementConfirmed).Find(&confirmedSettlements)

	for _, s := range confirmedSettlements {
		balances[s.PayerID] += s.Amount    // Payer paid, so they are owed more
		balances[s.ReceiverID] -= s.Amount // Receiver received, so they owe more
	}

	// Simplify debts
	type SimplifiedDebt struct {
		FromID   uint    `json:"from_id"`
		FromName string  `json:"from_name"`
		ToID     uint    `json:"to_id"`
		ToName   string  `json:"to_name"`
		Amount   float64 `json:"amount"`
	}

	var simplifiedDebts []SimplifiedDebt

	// Separate creditors and debtors
	var creditors []struct {
		ID     uint
		Amount float64
	}
	var debtors []struct {
		ID     uint
		Amount float64
	}

	for userID, balance := range balances {
		if balance > 0.01 {
			creditors = append(creditors, struct {
				ID     uint
				Amount float64
			}{userID, balance})
		} else if balance < -0.01 {
			debtors = append(debtors, struct {
				ID     uint
				Amount float64
			}{userID, -balance})
		}
	}

	// Simple debt simplification
	i, j := 0, 0
	for i < len(creditors) && j < len(debtors) {
		creditor := &creditors[i]
		debtor := &debtors[j]

		amount := creditor.Amount
		if debtor.Amount < amount {
			amount = debtor.Amount
		}

		if amount > 0.01 {
			simplifiedDebts = append(simplifiedDebts, SimplifiedDebt{
				FromID:   debtor.ID,
				FromName: userMap[debtor.ID].Name,
				ToID:     creditor.ID,
				ToName:   userMap[creditor.ID].Name,
				Amount:   amount,
			})
		}

		creditor.Amount -= amount
		debtor.Amount -= amount

		if creditor.Amount < 0.01 {
			i++
		}
		if debtor.Amount < 0.01 {
			j++
		}
	}

	return c.JSON(fiber.Map{
		"total_settled":    totalSettled,
		"pending_count":    pendingCount,
		"pending_amount":   pendingAmount,
		"simplified_debts": simplifiedDebts,
	})
}
