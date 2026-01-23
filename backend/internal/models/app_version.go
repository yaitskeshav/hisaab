package models

import "time"

type AppVersion struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Platform     string    `json:"platform" gorm:"not null;default:'android'"` // android, ios
	Version      string    `json:"version" gorm:"not null"`
	MinVersion   string    `json:"min_version"` // Minimum supported version
	DownloadURL  string    `json:"download_url"`
	ReleaseNotes string    `json:"release_notes"`
	ForceUpdate  bool      `json:"force_update" gorm:"default:false"`
	IsActive     bool      `json:"is_active" gorm:"default:true"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
