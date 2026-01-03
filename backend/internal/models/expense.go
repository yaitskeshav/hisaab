package models

import (
	"gorm.io/gorm"
	"time"
)

type Expense struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Title       string         `gorm:"not null" json:"title"`
	Amount      float64        `gorm:"not null" json:"amount"`
	Currency    string         `gorm:"default:'INR'" json:"currency"`
	Date        time.Time      `json:"date"`
	PaidByID    uint           `json:"paid_by_id"`
	PaidBy      User           `gorm:"foreignKey:PaidByID" json:"paid_by"`
	GroupID     uint           `json:"group_id"`
	Group       Group          `json:"group"`
	CategoryID  uint           `json:"category_id"`
	Category    Category       `json:"category"`
	SplitType   string         `gorm:"default:'EQUAL'" json:"split_type"` // EQUAL, CUSTOM
	SplitMode   string         `gorm:"default:''" json:"split_mode"`      // AMOUNT, PERCENTAGE, SINGLE (for CUSTOM type)
	IsSettled   bool           `gorm:"default:false" json:"is_settled"`
	ReferenceID string         `json:"reference_id"`
	AppName     string         `json:"app_name"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	Splits      []ExpenseSplit `gorm:"foreignKey:ExpenseID" json:"splits"`
	Attachments []Attachment   `gorm:"foreignKey:ExpenseID" json:"attachments"`
}

type ExpenseSplit struct {
	ID         uint     `gorm:"primaryKey" json:"id"`
	ExpenseID  uint     `json:"expense_id"`
	UserID     uint     `json:"user_id"`
	User       User     `json:"user"`
	Amount     float64  `json:"amount"`
	Percentage *float64 `json:"percentage,omitempty"` // Store percentage if split by percentage
}

type Category struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"not null" json:"name"`
	Icon      string         `json:"icon"`
	IsDefault bool           `gorm:"default:false" json:"is_default"`
	CreatedBy *uint          `json:"created_by"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Attachment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ExpenseID uint      `json:"expense_id"`
	FileName  string    `json:"file_name"`
	FilePath  string    `json:"file_path"`
	FileType  string    `json:"file_type"`
	CreatedAt time.Time `json:"created_at"`
}

type CustomAppName struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Name string `gorm:"uniqueIndex" json:"name"`
}

type ImportLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `json:"user_id"`
	Source    string    `json:"source"` // Splitwise CSV, etc.
	Status    string    `json:"status"` // PENDING, SUCCESS, FAILED
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

type ExportLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `json:"user_id"`
	Format    string    `json:"format"` // CSV, XLSX, DOCX
	FilePath  string    `json:"file_path"`
	CreatedAt time.Time `json:"created_at"`
}

// ExportToken represents a secure download token for exported files
type ExportToken struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index;not null" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"-"`
	GroupID   uint      `gorm:"index;not null" json:"group_id"`
	Group     Group     `gorm:"foreignKey:GroupID" json:"-"`
	Token     string    `gorm:"uniqueIndex;not null" json:"token"`
	FilePath  string    `gorm:"not null" json:"file_path"`
	FileName  string    `json:"file_name"`
	Format    string    `gorm:"not null" json:"format"` // pdf, csv, xlsx
	FileSize  int64     `json:"file_size"`              // Size in bytes
	ExpiresAt time.Time `gorm:"index;not null" json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// Settlement status constants
const (
	SettlementPending   = "pending"
	SettlementConfirmed = "confirmed"
	SettlementRejected  = "rejected"
)

// Settlement represents a payment between two users to settle debts
type Settlement struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	GroupID     uint           `gorm:"index;not null" json:"group_id"`
	Group       Group          `json:"group,omitempty"`
	PayerID     uint           `gorm:"not null" json:"payer_id"` // User who is paying
	Payer       User           `gorm:"foreignKey:PayerID" json:"payer"`
	ReceiverID  uint           `gorm:"not null" json:"receiver_id"` // User who receives payment
	Receiver    User           `gorm:"foreignKey:ReceiverID" json:"receiver"`
	Amount      float64        `gorm:"not null" json:"amount"`
	Currency    string         `gorm:"default:'INR'" json:"currency"`
	Note        string         `json:"note"`
	Status      string         `gorm:"default:'pending'" json:"status"`   // pending, confirmed, rejected
	IsOptimized bool           `gorm:"default:false" json:"is_optimized"` // True if this was part of debt simplification
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	ConfirmedAt *time.Time     `json:"confirmed_at,omitempty"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// Activity types
const (
	ActivityGroupCreated        = "group_created"
	ActivityGroupRenamed        = "group_renamed"
	ActivityGroupDeleted        = "group_deleted"
	ActivityMemberJoined        = "member_joined"
	ActivityMemberLeft          = "member_left"
	ActivityExpenseAdded        = "expense_added"
	ActivityExpenseEdited       = "expense_edited"
	ActivityExpenseDeleted      = "expense_deleted"
	ActivityExpenseSettled      = "expense_settled"
	ActivityExpenseUnsettled    = "expense_unsettled"
	ActivitySettlementCreated   = "settlement_created"
	ActivitySettlementConfirmed = "settlement_confirmed"
	ActivitySettlementRejected  = "settlement_rejected"
)

// Activity represents an action taken in a group
type Activity struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	GroupID     uint   `gorm:"index" json:"group_id"`
	Group       Group  `json:"-"`
	UserID      uint   `json:"user_id"`
	User        User   `json:"user"`
	Type        string `gorm:"not null" json:"type"`
	Description string `json:"description"`
	// Optional references
	ExpenseID    *uint     `json:"expense_id,omitempty"`
	ExpenseTitle string    `json:"expense_title,omitempty"`
	Amount       *float64  `json:"amount,omitempty"`
	CategoryID   *uint     `json:"category_id,omitempty"`
	TargetUserID *uint     `json:"target_user_id,omitempty"`
	TargetUser   *User     `gorm:"foreignKey:TargetUserID" json:"target_user,omitempty"`
	OldValue     string    `json:"old_value,omitempty"`
	NewValue     string    `json:"new_value,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}
