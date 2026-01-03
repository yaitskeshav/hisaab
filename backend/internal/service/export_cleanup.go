package service

import (
	"log"
	"os"
	"time"

	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
)

// StartExportCleanupJob starts a background goroutine that cleans up expired export tokens and files
func StartExportCleanupJob() {
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		// Run once immediately
		cleanupExpiredExports()

		for range ticker.C {
			cleanupExpiredExports()
		}
	}()
	log.Println("Export cleanup job started (runs every hour)")
}

func cleanupExpiredExports() {
	var expiredTokens []models.ExportToken
	if err := database.DB.Where("expires_at < ?", time.Now()).Find(&expiredTokens).Error; err != nil {
		log.Printf("Failed to fetch expired export tokens: %v", err)
		return
	}

	if len(expiredTokens) == 0 {
		return
	}

	log.Printf("Cleaning up %d expired export(s)", len(expiredTokens))

	for _, token := range expiredTokens {
		// Delete file
		if err := os.Remove(token.FilePath); err != nil && !os.IsNotExist(err) {
			log.Printf("Failed to delete export file %s: %v", token.FilePath, err)
		}

		// Delete database record
		if err := database.DB.Delete(&token).Error; err != nil {
			log.Printf("Failed to delete export token %d: %v", token.ID, err)
		}
	}

	log.Printf("Cleaned up %d expired export(s)", len(expiredTokens))
}
