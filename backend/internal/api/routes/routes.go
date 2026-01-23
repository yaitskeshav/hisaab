package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hisaab/backend/internal/api/handlers"
	"github.com/hisaab/backend/internal/api/middleware"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api")
	v1 := api.Group("/v1")

	// Auth routes
	authHandler := handlers.NewAuthHandler()
	exportHandler := handlers.NewExportHandler()
	inviteHandler := handlers.NewInviteHandler()
	importHandler := handlers.NewImportHandler()
	auth := v1.Group("/auth")
	auth.Post("/signup", authHandler.Signup)
	auth.Post("/login", authHandler.Login)
	auth.Post("/refresh", authHandler.Refresh)
	auth.Post("/google", authHandler.GoogleLogin)
	auth.Post("/forgot-password", authHandler.ForgotPassword)
	auth.Post("/reset-password", authHandler.ResetPassword)
	auth.Get("/reset-redirect", authHandler.ResetPasswordRedirect)
	auth.Post("/verify-email", authHandler.VerifyEmail)
	auth.Post("/resend-verification", authHandler.ResendVerification)

	// Public but token-protected download route (must be before protected group)
	v1.Get("/downloads/:token", exportHandler.DownloadExport)

	// Invite routes (Public validation)
	v1.Get("/invites/:token", inviteHandler.GetInviteDetails)

	// App version route (Public - needed before login)
	appVersionHandler := handlers.NewAppVersionHandler()
	v1.Get("/app/version", appVersionHandler.GetLatestVersion)

	// Protected routes
	protected := v1.Group("/", middleware.AuthProtected())

	// User routes
	protected.Get("/me", func(c *fiber.Ctx) error {
		userID := c.Locals("user_id")
		var user models.User
		if err := database.DB.First(&user, userID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
		}
		return c.JSON(user)
	})
	protected.Put("/profile", authHandler.UpdateProfile)
	protected.Post("/profile/avatar", authHandler.UploadAvatar)
	protected.Delete("/profile/avatar", authHandler.DeleteAvatar)
	protected.Put("/fcm-token", authHandler.UpdateFCMToken)
	protected.Get("/notification-prefs", authHandler.GetNotificationPrefs)
	protected.Put("/notification-prefs", authHandler.UpdateNotificationPrefs)

	// Group routes
	groupHandler := handlers.NewGroupHandler()
	groups := protected.Group("/groups")
	groups.Post("/", groupHandler.CreateGroup)
	groups.Get("/", groupHandler.GetGroups)
	groups.Get("/:id", groupHandler.GetGroupDetails)
	groups.Post("/join/:code", groupHandler.JoinGroupByCode)

	// Invite routes (Protected)
	protected.Post("/invites", inviteHandler.CreateInvite)
	protected.Post("/invites/:token/join", inviteHandler.JoinWithToken)
	groups.Put("/:id", groupHandler.UpdateGroup)
	groups.Put("/:id/icon", groupHandler.UpdateGroupIcon)
	groups.Delete("/:id/icon", groupHandler.RemoveGroupIcon)
	groups.Get("/:id/can-leave", groupHandler.CanLeaveGroup)
	groups.Post("/:id/leave", groupHandler.LeaveGroup)
	groups.Delete("/:id", groupHandler.DeleteGroup)

	// Expense routes
	expenseHandler := handlers.NewExpenseHandler()
	expenses := protected.Group("/expenses")
	expenses.Post("/", expenseHandler.CreateExpense)
	expenses.Get("/group/:groupID", expenseHandler.GetGroupExpenses)
	expenses.Get("/:id", expenseHandler.GetExpense)
	expenses.Put("/:id", expenseHandler.UpdateExpense)
	expenses.Put("/:id/settle", expenseHandler.SettleExpense)
	expenses.Put("/:id/unsettle", expenseHandler.UnsettleExpense)
	expenses.Delete("/:id", expenseHandler.DeleteExpense)

	// Settlement routes
	settlementHandler := handlers.NewSettlementHandler()
	settlements := protected.Group("/settlements")
	settlements.Post("/", settlementHandler.CreateSettlement)
	settlements.Get("/pending", settlementHandler.GetPendingSettlements)
	settlements.Get("/balances", settlementHandler.GetUserTotalBalances) // User's total balances across all groups
	settlements.Get("/group/:groupId", settlementHandler.GetGroupSettlements)
	settlements.Put("/:id/confirm", settlementHandler.ConfirmSettlement)
	settlements.Put("/:id/reject", settlementHandler.RejectSettlement)
	settlements.Delete("/:id", settlementHandler.DeleteSettlement)

	// Group balances (for settle up screen)
	groups.Get("/:groupId/balances", settlementHandler.GetGroupBalances)

	// Activity routes
	activityHandler := handlers.NewActivityHandler()
	activities := protected.Group("/activities")
	activities.Get("/", activityHandler.GetActivities)
	activities.Get("/group/:groupId", activityHandler.GetGroupActivities)

	// Category routes
	categoryHandler := handlers.NewCategoryHandler()
	categories := protected.Group("/categories")
	categories.Get("/", categoryHandler.GetCategories)
	categories.Post("/", categoryHandler.CreateCategory)

	// Attachment routes
	attachmentHandler := handlers.NewAttachmentHandler()
	protected.Post("/attachments", attachmentHandler.UploadAttachment)
	protected.Get("/attachments/:id/download", attachmentHandler.DownloadAttachment)
	protected.Delete("/attachments/:id", attachmentHandler.DeleteAttachment)

	// Analytics routes
	analyticsHandler := handlers.NewAnalyticsHandler()
	protected.Get("/analytics/group/:groupID", analyticsHandler.GetGroupAnalytics)

	// Import/Export routes
	io := protected.Group("/io")
	io.Get("/export/csv/:groupID", exportHandler.ExportCSV)
	io.Get("/export/xlsx/:groupID", exportHandler.ExportXLSX)
	io.Post("/export/request", exportHandler.RequestExport)
	io.Post("/import/splitwise", importHandler.ImportSplitwiseCSV)
}
