package database

import (
	"fmt"
	"log"
	"os"

	"github.com/hisaab/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB() {
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable", host, user, password, dbname, port)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatal("Failed to connect to database. \n", err)
	}

	log.Println("connected")
	db.Logger = logger.Default.LogMode(logger.Info)

	log.Println("running migrations")
	db.AutoMigrate(
		&models.User{},
		&models.Group{},
		&models.GroupMember{},
		&models.Expense{},
		&models.ExpenseSplit{},
		&models.Category{},
		&models.Attachment{},
		&models.CustomAppName{},
		&models.ImportLog{},
		&models.ExportLog{},
		&models.ExportToken{},
		&models.Activity{},
		&models.Settlement{},
		&models.GroupInvite{},
	)

	DB = db

	// Seed default categories
	seedDefaultCategories(db)
}

func seedDefaultCategories(db *gorm.DB) {
	categories := []models.Category{
		{ID: 1, Name: "Food", Icon: "🍽️", IsDefault: true},
		{ID: 2, Name: "Groceries", Icon: "🛒", IsDefault: true},
		{ID: 3, Name: "Transport", Icon: "🚗", IsDefault: true},
		{ID: 4, Name: "Travel", Icon: "✈️", IsDefault: true},
		{ID: 5, Name: "Entertainment", Icon: "🎬", IsDefault: true},
		{ID: 6, Name: "Shopping", Icon: "🛍️", IsDefault: true},
		{ID: 7, Name: "Bills", Icon: "📄", IsDefault: true},
		{ID: 8, Name: "Rent", Icon: "🏠", IsDefault: true},
		{ID: 9, Name: "Drinks", Icon: "🍺", IsDefault: true},
		{ID: 10, Name: "Healthcare", Icon: "💊", IsDefault: true},
		{ID: 11, Name: "Subscriptions", Icon: "📱", IsDefault: true},
		{ID: 12, Name: "Gifts", Icon: "🎁", IsDefault: true},
		{ID: 13, Name: "Sports", Icon: "⚽", IsDefault: true},
		{ID: 14, Name: "Education", Icon: "📚", IsDefault: true},
		{ID: 15, Name: "Pets", Icon: "🐾", IsDefault: true},
		{ID: 16, Name: "Other", Icon: "📌", IsDefault: true},
	}

	for _, cat := range categories {
		var existing models.Category
		if db.Where("id = ?", cat.ID).First(&existing).Error != nil {
			// Create if doesn't exist
			db.Create(&cat)
		} else {
			// Update existing category icon and name
			db.Model(&existing).Updates(models.Category{Name: cat.Name, Icon: cat.Icon})
		}
	}
}
