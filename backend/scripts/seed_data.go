package main

import (
	"fmt"
	"log"
	"math/rand"
	"net/url"
	"time"

	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Connect to database
	database.ConnectDB()

	log.Println("Clearing existing data...")
	clearData()

	log.Println("Seeding demo data...")

	// Create sample users with Indian names
	users := createSampleUsers()
	log.Printf("Created %d users\n", len(users))

	// Create sample groups
	groups := createSampleGroups(users)
	log.Printf("Created %d groups\n", len(groups))

	// Create sample expenses with splits
	expenses := createSampleExpenses(users, groups)
	log.Printf("Created %d expenses\n", len(expenses))

	// Create settlements
	settlements := createSampleSettlements(users, groups)
	log.Printf("Created %d settlements\n", len(settlements))

	// Create activity logs
	activities := createActivityLogs(users, groups, expenses, settlements)
	log.Printf("Created %d activities\n", len(activities))

	log.Println("Seeding completed!")
	log.Println("\n=== Login Credentials ===")
	log.Println("Email: arjun@example.com | Password: demo1234")
	log.Println("Email: priya@example.com | Password: demo1234")
	log.Println("Email: vikram@example.com | Password: demo1234")
	log.Println("Email: neha@example.com | Password: demo1234")
	log.Println("Email: rohit@example.com | Password: demo1234")
}

func clearData() {
	// Clear in reverse order of dependencies
	database.DB.Exec("DELETE FROM activities")
	database.DB.Exec("DELETE FROM settlements")
	database.DB.Exec("DELETE FROM expense_splits")
	database.DB.Exec("DELETE FROM expenses")
	database.DB.Exec("DELETE FROM group_members")
	database.DB.Exec("DELETE FROM groups")
	database.DB.Exec("DELETE FROM users")
}

func getAvatarURL(name string, bg string) string {
	return fmt.Sprintf("https://ui-avatars.com/api/?name=%s&background=%s&color=fff&size=200&bold=true",
		url.QueryEscape(name), bg)
}

func createSampleUsers() []models.User {
	password := "demo1234"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	users := []models.User{
		{
			Email:     "arjun@example.com",
			Password:  string(hashedPassword),
			Name:      "Arjun Sharma",
			AvatarURL: getAvatarURL("Arjun Sharma", "3B82F6"),
		},
		{
			Email:     "priya@example.com",
			Password:  string(hashedPassword),
			Name:      "Priya Patel",
			AvatarURL: getAvatarURL("Priya Patel", "8B5CF6"),
		},
		{
			Email:     "vikram@example.com",
			Password:  string(hashedPassword),
			Name:      "Vikram Singh",
			AvatarURL: getAvatarURL("Vikram Singh", "10B981"),
		},
		{
			Email:     "neha@example.com",
			Password:  string(hashedPassword),
			Name:      "Neha Gupta",
			AvatarURL: getAvatarURL("Neha Gupta", "F59E0B"),
		},
		{
			Email:     "rohit@example.com",
			Password:  string(hashedPassword),
			Name:      "Rohit Verma",
			AvatarURL: getAvatarURL("Rohit Verma", "EF4444"),
		},
	}

	for i := range users {
		database.DB.Create(&users[i])
	}

	return users
}

func createSampleGroups(users []models.User) []models.Group {
	groups := []models.Group{
		{
			Name:        "Goa Trip 2024",
			Description: "New Year trip to Goa with college friends",
			CreatedByID: users[0].ID,
			InviteCode:  "GOA2024X",
			Members:     []models.User{users[0], users[1], users[2], users[3]},
		},
		{
			Name:        "Flat Expenses",
			Description: "Monthly rent, bills & groceries",
			CreatedByID: users[0].ID,
			InviteCode:  "FLAT2024",
			Members:     []models.User{users[0], users[1], users[2]},
		},
		{
			Name:        "Office Lunch",
			Description: "Daily lunch expenses with team",
			CreatedByID: users[1].ID,
			InviteCode:  "LUNCH24",
			Members:     []models.User{users[0], users[1], users[3], users[4]},
		},
		{
			Name:        "Weekend Trips",
			Description: "Short getaways and day trips",
			CreatedByID: users[2].ID,
			InviteCode:  "WKND2024",
			Members:     []models.User{users[0], users[1], users[2], users[3], users[4]},
		},
	}

	for i := range groups {
		database.DB.Create(&groups[i])
	}

	return groups
}

func createSampleExpenses(users []models.User, groups []models.Group) []models.Expense {
	now := time.Now()

	expenses := []models.Expense{
		// ===== Goa Trip 2024 (Group 0) =====
		{
			Title:      "Flight Tickets - Mumbai to Goa",
			Amount:     24800.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -12),
			PaidByID:   users[0].ID,
			GroupID:    groups[0].ID,
			CategoryID: 4, // Travel
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
		{
			Title:      "Taj Resort Booking",
			Amount:     18500.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -12),
			PaidByID:   users[1].ID,
			GroupID:    groups[0].ID,
			CategoryID: 4, // Travel
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
		{
			Title:      "Dinner at Fisherman's Wharf",
			Amount:     4200.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -10),
			PaidByID:   users[2].ID,
			GroupID:    groups[0].ID,
			CategoryID: 1, // Food
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
		{
			Title:      "Scooter Rental - 3 Days",
			Amount:     2400.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -10),
			PaidByID:   users[0].ID,
			GroupID:    groups[0].ID,
			CategoryID: 3, // Transport
			SplitType:  "EQUAL",
			IsSettled:  true,
		},
		{
			Title:      "Parasailing & Jet Ski",
			Amount:     6000.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -9),
			PaidByID:   users[3].ID,
			GroupID:    groups[0].ID,
			CategoryID: 5, // Entertainment
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
		{
			Title:      "Clubbing at Tito's",
			Amount:     8500.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -9),
			PaidByID:   users[1].ID,
			GroupID:    groups[0].ID,
			CategoryID: 9, // Drinks
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
		{
			Title:      "Breakfast at Cafe Mambo",
			Amount:     2100.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -8),
			PaidByID:   users[2].ID,
			GroupID:    groups[0].ID,
			CategoryID: 1, // Food
			SplitType:  "EQUAL",
			IsSettled:  true,
		},
		{
			Title:      "Souvenirs & Shopping",
			Amount:     3600.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -8),
			PaidByID:   users[0].ID,
			GroupID:    groups[0].ID,
			CategoryID: 6, // Shopping
			SplitType:  "EQUAL",
			IsSettled:  false,
		},

		// ===== Flat Expenses (Group 1) =====
		{
			Title:      "January Rent",
			Amount:     45000.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -2),
			PaidByID:   users[0].ID,
			GroupID:    groups[1].ID,
			CategoryID: 8, // Rent
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
		{
			Title:      "Electricity Bill - December",
			Amount:     3200.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -5),
			PaidByID:   users[1].ID,
			GroupID:    groups[1].ID,
			CategoryID: 7, // Bills
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
		{
			Title:      "WiFi - Airtel Xstream",
			Amount:     1499.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -7),
			PaidByID:   users[2].ID,
			GroupID:    groups[1].ID,
			CategoryID: 7, // Bills
			SplitType:  "EQUAL",
			IsSettled:  true,
		},
		{
			Title:      "Groceries - Big Bazaar",
			Amount:     4500.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -3),
			PaidByID:   users[0].ID,
			GroupID:    groups[1].ID,
			CategoryID: 2, // Groceries
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
		{
			Title:      "Gas Cylinder Refill",
			Amount:     950.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -4),
			PaidByID:   users[1].ID,
			GroupID:    groups[1].ID,
			CategoryID: 7, // Bills
			SplitType:  "EQUAL",
			IsSettled:  true,
		},
		{
			Title:      "Milk & Daily Essentials",
			Amount:     1200.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -1),
			PaidByID:   users[2].ID,
			GroupID:    groups[1].ID,
			CategoryID: 2, // Groceries
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
		{
			Title:      "Netflix Subscription",
			Amount:     649.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -6),
			PaidByID:   users[0].ID,
			GroupID:    groups[1].ID,
			CategoryID: 11, // Subscriptions
			SplitType:  "EQUAL",
			IsSettled:  true,
		},

		// ===== Office Lunch (Group 2) =====
		{
			Title:      "Biryani at Paradise",
			Amount:     1600.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -1),
			PaidByID:   users[1].ID,
			GroupID:    groups[2].ID,
			CategoryID: 1, // Food
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
		{
			Title:      "Domino's Pizza Party",
			Amount:     2200.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -2),
			PaidByID:   users[0].ID,
			GroupID:    groups[2].ID,
			CategoryID: 1, // Food
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
		{
			Title:      "Coffee at Starbucks",
			Amount:     1400.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -2),
			PaidByID:   users[3].ID,
			GroupID:    groups[2].ID,
			CategoryID: 9, // Drinks
			SplitType:  "EQUAL",
			IsSettled:  true,
		},
		{
			Title:      "Subway Lunch",
			Amount:     1100.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -3),
			PaidByID:   users[4].ID,
			GroupID:    groups[2].ID,
			CategoryID: 1, // Food
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
		{
			Title:      "South Indian Thali",
			Amount:     800.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -4),
			PaidByID:   users[1].ID,
			GroupID:    groups[2].ID,
			CategoryID: 1, // Food
			SplitType:  "EQUAL",
			IsSettled:  true,
		},
		{
			Title:      "Team Snacks",
			Amount:     650.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -5),
			PaidByID:   users[0].ID,
			GroupID:    groups[2].ID,
			CategoryID: 1, // Food
			SplitType:  "EQUAL",
			IsSettled:  false,
		},

		// ===== Weekend Trips (Group 3) =====
		{
			Title:      "Lonavala Day Trip - Cab",
			Amount:     3500.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -14),
			PaidByID:   users[2].ID,
			GroupID:    groups[3].ID,
			CategoryID: 3, // Transport
			SplitType:  "EQUAL",
			IsSettled:  true,
		},
		{
			Title:      "Lunch at Kinara Dhaba",
			Amount:     2800.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -14),
			PaidByID:   users[3].ID,
			GroupID:    groups[3].ID,
			CategoryID: 1, // Food
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
		{
			Title:      "Entry Tickets - Karla Caves",
			Amount:     500.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -14),
			PaidByID:   users[0].ID,
			GroupID:    groups[3].ID,
			CategoryID: 5, // Entertainment
			SplitType:  "EQUAL",
			IsSettled:  true,
		},
		{
			Title:      "Imagica Tickets",
			Amount:     8500.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -7),
			PaidByID:   users[1].ID,
			GroupID:    groups[3].ID,
			CategoryID: 5, // Entertainment
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
		{
			Title:      "Bus to Imagica",
			Amount:     1200.00,
			Currency:   "INR",
			Date:       now.AddDate(0, 0, -7),
			PaidByID:   users[4].ID,
			GroupID:    groups[3].ID,
			CategoryID: 3, // Transport
			SplitType:  "EQUAL",
			IsSettled:  false,
		},
	}

	for i := range expenses {
		// Create expense
		database.DB.Create(&expenses[i])

		// Create splits based on group members
		var group models.Group
		database.DB.Preload("Members").First(&group, expenses[i].GroupID)

		memberCount := len(group.Members)
		splitAmount := expenses[i].Amount / float64(memberCount)

		for _, member := range group.Members {
			split := models.ExpenseSplit{
				ExpenseID: expenses[i].ID,
				UserID:    member.ID,
				Amount:    splitAmount,
			}
			database.DB.Create(&split)
		}
	}

	return expenses
}

func createSampleSettlements(users []models.User, groups []models.Group) []models.Settlement {
	now := time.Now()
	confirmedAt := now.AddDate(0, 0, -1)

	settlements := []models.Settlement{
		{
			GroupID:     groups[0].ID,
			PayerID:     users[2].ID,
			ReceiverID:  users[0].ID,
			Amount:      5000.00,
			Currency:    "INR",
			Note:        "Partial settlement for Goa trip",
			Status:      models.SettlementConfirmed,
			ConfirmedAt: &confirmedAt,
		},
		{
			GroupID:    groups[1].ID,
			PayerID:    users[1].ID,
			ReceiverID: users[0].ID,
			Amount:     8500.00,
			Currency:   "INR",
			Note:       "Rent share for January",
			Status:     models.SettlementPending,
		},
		{
			GroupID:     groups[2].ID,
			PayerID:     users[3].ID,
			ReceiverID:  users[1].ID,
			Amount:      750.00,
			Currency:    "INR",
			Note:        "Lunch dues",
			Status:      models.SettlementConfirmed,
			ConfirmedAt: &confirmedAt,
		},
	}

	for i := range settlements {
		database.DB.Create(&settlements[i])
	}

	return settlements
}

func createActivityLogs(users []models.User, groups []models.Group, expenses []models.Expense, settlements []models.Settlement) []models.Activity {
	now := time.Now()
	activities := []models.Activity{}

	// Group creation activities
	for i, group := range groups {
		activity := models.Activity{
			GroupID:     group.ID,
			UserID:      group.CreatedByID,
			Type:        models.ActivityGroupCreated,
			Description: fmt.Sprintf("%s created the group", users[i%len(users)].Name),
			CreatedAt:   now.AddDate(0, 0, -20+i),
		}
		database.DB.Create(&activity)
		activities = append(activities, activity)
	}

	// Member joined activities
	for _, group := range groups {
		var g models.Group
		database.DB.Preload("Members").First(&g, group.ID)

		for j, member := range g.Members {
			if member.ID != group.CreatedByID {
				activity := models.Activity{
					GroupID:      group.ID,
					UserID:       member.ID,
					Type:         models.ActivityMemberJoined,
					Description:  fmt.Sprintf("%s joined the group", member.Name),
					TargetUserID: &member.ID,
					CreatedAt:    now.AddDate(0, 0, -18+j),
				}
				database.DB.Create(&activity)
				activities = append(activities, activity)
			}
		}
	}

	// Expense activities (sample - not all)
	for i, expense := range expenses {
		if i%3 == 0 { // Only log every 3rd expense to avoid too many
			var user models.User
			database.DB.First(&user, expense.PaidByID)

			amount := expense.Amount
			activity := models.Activity{
				GroupID:      expense.GroupID,
				UserID:       expense.PaidByID,
				Type:         models.ActivityExpenseAdded,
				Description:  fmt.Sprintf("%s added \"%s\"", user.Name, expense.Title),
				ExpenseID:    &expense.ID,
				ExpenseTitle: expense.Title,
				Amount:       &amount,
				CategoryID:   &expense.CategoryID,
				CreatedAt:    expense.Date.Add(time.Duration(rand.Intn(60)) * time.Minute),
			}
			database.DB.Create(&activity)
			activities = append(activities, activity)
		}
	}

	// Settlement activities
	for _, settlement := range settlements {
		var payer, receiver models.User
		database.DB.First(&payer, settlement.PayerID)
		database.DB.First(&receiver, settlement.ReceiverID)

		// Settlement created
		amount := settlement.Amount
		activity := models.Activity{
			GroupID:      settlement.GroupID,
			UserID:       settlement.PayerID,
			Type:         models.ActivitySettlementCreated,
			Description:  fmt.Sprintf("%s recorded a payment of ₹%.0f to %s", payer.Name, settlement.Amount, receiver.Name),
			Amount:       &amount,
			TargetUserID: &settlement.ReceiverID,
			CreatedAt:    now.AddDate(0, 0, -2),
		}
		database.DB.Create(&activity)
		activities = append(activities, activity)

		// Settlement confirmed (if confirmed)
		if settlement.Status == models.SettlementConfirmed {
			activity2 := models.Activity{
				GroupID:      settlement.GroupID,
				UserID:       settlement.ReceiverID,
				Type:         models.ActivitySettlementConfirmed,
				Description:  fmt.Sprintf("%s confirmed receiving ₹%.0f from %s", receiver.Name, settlement.Amount, payer.Name),
				Amount:       &amount,
				TargetUserID: &settlement.PayerID,
				CreatedAt:    now.AddDate(0, 0, -1),
			}
			database.DB.Create(&activity2)
			activities = append(activities, activity2)
		}
	}

	return activities
}
