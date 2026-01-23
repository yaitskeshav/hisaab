package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
)

type AppVersionHandler struct{}

func NewAppVersionHandler() *AppVersionHandler {
	return &AppVersionHandler{}
}

// GetLatestVersion returns the latest app version info for a platform
// GET /api/v1/app/version?platform=android
func (h *AppVersionHandler) GetLatestVersion(c *fiber.Ctx) error {
	platform := c.Query("platform", "android")

	var appVersion models.AppVersion
	result := database.DB.Where("platform = ? AND is_active = ?", platform, true).
		Order("created_at DESC").
		First(&appVersion)

	if result.Error != nil {
		// Return default response if no version in DB
		return c.JSON(fiber.Map{
			"version":       "1.0.0",
			"min_version":   "1.0.0",
			"download_url":  "",
			"release_notes": "",
			"force_update":  false,
		})
	}

	return c.JSON(fiber.Map{
		"version":       appVersion.Version,
		"min_version":   appVersion.MinVersion,
		"download_url":  appVersion.DownloadURL,
		"release_notes": appVersion.ReleaseNotes,
		"force_update":  appVersion.ForceUpdate,
	})
}
