package models

import (
	"gorm.io/gorm"
	"time"
)

type User struct {
	ID                         uint      `gorm:"primaryKey" json:"id"`
	Email                      string    `gorm:"uniqueIndex;not null" json:"email"`
	Password                   string    `json:"-"`
	Name                       string    `json:"name"`
	AvatarURL                  string    `json:"avatar_url"`
	GoogleID                   *string   `gorm:"uniqueIndex" json:"google_id"`
	FCMToken                   string    `json:"fcm_token"`
	RefreshToken               string    `json:"-"`
	ResetToken                 string    `json:"-"`
	ResetTokenExpiresAt        time.Time `json:"-"`
	EmailVerificationToken     string    `json:"-"`
	EmailVerificationExpiresAt time.Time `json:"-"`
	IsEmailVerified            bool      `gorm:"default:false" json:"is_email_verified"`
	// Notification preferences (all default to true)
	NotifyMemberJoined      bool           `gorm:"default:true" json:"notify_member_joined"`
	NotifyExpenseAdded      bool           `gorm:"default:true" json:"notify_expense_added"`
	NotifyExpenseEdited     bool           `gorm:"default:true" json:"notify_expense_edited"`
	NotifySettlementCreated bool           `gorm:"default:true" json:"notify_settlement_created"`
	NotifySettlementConfirm bool           `gorm:"default:true" json:"notify_settlement_confirm"`
	CreatedAt               time.Time      `json:"created_at"`
	UpdatedAt               time.Time      `json:"updated_at"`
	DeletedAt               gorm.DeletedAt `gorm:"index" json:"-"`
	Groups                  []Group        `gorm:"many2many:group_members;" json:"groups"`
}

type Group struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"not null" json:"name"`
	Description string         `json:"description"`
	CreatedByID uint           `json:"created_by_id"`
	CreatedBy   User           `gorm:"foreignKey:CreatedByID" json:"created_by"`
	InviteCode  string         `gorm:"uniqueIndex" json:"invite_code"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	Members     []User         `gorm:"many2many:group_members;" json:"members"`
	Expenses    []Expense      `json:"expenses"`
}

type GroupMember struct {
	GroupID  uint      `gorm:"primaryKey"`
	UserID   uint      `gorm:"primaryKey"`
	JoinedAt time.Time `json:"joined_at"`
}
