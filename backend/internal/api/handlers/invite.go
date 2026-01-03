package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
	"github.com/hisaab/backend/internal/utils"
)

type InviteHandler struct{}

func NewInviteHandler() *InviteHandler {
	return &InviteHandler{}
}

func (h *InviteHandler) CreateInvite(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var req struct {
		GroupID uint `json:"group_id"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	// Verify user is in group
	var group models.Group
	if err := database.DB.Preload("Members").First(&group, req.GroupID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "group not found"})
	}

	isMember := false
	for _, m := range group.Members {
		if m.ID == userID {
			isMember = true
			break
		}
	}
	if !isMember {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "you are not a member of this group"})
	}

	// Generate secure token
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate token"})
	}
	token := hex.EncodeToString(b)

	invite := models.GroupInvite{
		GroupID:     req.GroupID,
		CreatedByID: userID,
		Token:       token,
		ExpiresAt:   time.Now().Add(7 * 24 * time.Hour), // 7 days
	}

	if err := database.DB.Create(&invite).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create invite"})
	}

	landingPageURL := os.Getenv("INVITATION_LANDING_URL")
	if landingPageURL == "" {
		landingPageURL = "https://digitalhisaab.me"
	}

	inviteLink := fmt.Sprintf("%s/invite/%s", landingPageURL, token)

	return c.JSON(fiber.Map{
		"token":       token,
		"invite_link": inviteLink,
		"expires_at":  invite.ExpiresAt,
	})
}

func (h *InviteHandler) GetInviteDetails(c *fiber.Ctx) error {
	token := c.Params("token")

	var invite models.GroupInvite
	if err := database.DB.Preload("Group").Preload("Group.Members").Preload("CreatedBy").Where("token = ? AND expires_at > ?", token, time.Now()).First(&invite).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "invalid or expired invite link"})
	}

	isMember := false
	authHeader := c.Get("Authorization")
	queryToken := c.Query("access_token") // Fallback option

	tokenString := ""
	if authHeader != "" {
		tokenString = strings.TrimPrefix(authHeader, "Bearer ")
	} else if queryToken != "" {
		tokenString = queryToken
	}

	if tokenString != "" {
		claims, err := utils.ValidateToken(tokenString, false)
		if err == nil {
			userID := claims.UserID
			for _, member := range invite.Group.Members {
				if member.ID == userID {
					isMember = true
					break
				}
			}
		}
	}

	return c.JSON(fiber.Map{
		"group_name":   invite.Group.Name,
		"member_count": len(invite.Group.Members),
		"group_id":     invite.GroupID,
		"created_by":   invite.CreatedBy.Name,
		"is_member":    isMember,
	})
}

func (h *InviteHandler) JoinWithToken(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	token := c.Params("token")

	var invite models.GroupInvite
	if err := database.DB.Preload("Group.Members").Where("token = ? AND expires_at > ?", token, time.Now()).First(&invite).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "invalid or expired invite link"})
	}

	// Check if already a member
	for _, m := range invite.Group.Members {
		if m.ID == userID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "already a member of this group"})
		}
	}

	// Add user to group
	if err := database.DB.Model(&invite.Group).Association("Members").Append(&models.User{ID: userID}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to join group"})
	}

	return c.JSON(fiber.Map{
		"message":    "joined group successfully",
		"group_id":   invite.GroupID,
		"group_name": invite.Group.Name,
	})
}
