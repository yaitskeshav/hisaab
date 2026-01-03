package models

import (
	"time"
)

type GroupInvite struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	GroupID     uint      `gorm:"not null" json:"group_id"`
	Group       Group     `gorm:"foreignKey:GroupID" json:"group"`
	CreatedByID uint      `gorm:"not null" json:"created_by_id"`
	CreatedBy   User      `gorm:"foreignKey:CreatedByID" json:"created_by"`
	Token       string    `gorm:"uniqueIndex;not null" json:"token"`
	ExpiresAt   time.Time `json:"expires_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
