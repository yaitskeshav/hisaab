package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/hisaab/backend/internal/api/routes"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/service"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file, using environment variables")
	}

	// Connect to database
	database.ConnectDB()

	// Start background jobs
	service.StartExportCleanupJob()

	app := fiber.New(fiber.Config{
		AppName: "Hisaab API v1.0",
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// NOTE: Expense attachments served through protected /api/v1/attachments/:id/download endpoint
	// Avatar and group icon images are public and served statically
	app.Static("/uploads/avatars", "./uploads/avatars")
	app.Static("/uploads/groups", "./uploads/groups")

	// Routes
	routes.SetupRoutes(app)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Fatal(app.Listen(":" + port))
}
