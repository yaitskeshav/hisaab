package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
)

type ActivityHandler struct{}

func NewActivityHandler() *ActivityHandler {
	return &ActivityHandler{}
}

// GetActivities returns activities for all groups the user is a member of
func (h *ActivityHandler) GetActivities(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	// Get pagination params
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Optional filters
	groupID := c.Query("group_id")
	activityType := c.Query("type")

	// Get user's groups
	var user models.User
	if err := database.DB.Preload("Groups").First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	// Get group IDs
	var groupIDs []uint
	for _, group := range user.Groups {
		groupIDs = append(groupIDs, group.ID)
	}

	if len(groupIDs) == 0 {
		return c.JSON(fiber.Map{
			"activities": []models.Activity{},
			"page":       page,
			"limit":      limit,
			"total":      0,
		})
	}

	// Build query
	query := database.DB.Where("group_id IN ?", groupIDs)

	// Apply filters
	if groupID != "" {
		query = query.Where("group_id = ?", groupID)
	}
	if activityType != "" {
		query = query.Where("type = ?", activityType)
	}

	// Get total count
	var total int64
	query.Model(&models.Activity{}).Count(&total)

	// Fetch activities with pagination
	var activities []models.Activity
	if err := query.
		Preload("User").
		Preload("TargetUser").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&activities).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch activities"})
	}

	// Get group names for each activity
	type ActivityResponse struct {
		models.Activity
		GroupName string `json:"group_name"`
	}

	var response []ActivityResponse
	groupNameCache := make(map[uint]string)
	for _, act := range activities {
		groupName, ok := groupNameCache[act.GroupID]
		if !ok {
			var group models.Group
			database.DB.Select("name").First(&group, act.GroupID)
			groupName = group.Name
			groupNameCache[act.GroupID] = groupName
		}
		response = append(response, ActivityResponse{
			Activity:  act,
			GroupName: groupName,
		})
	}

	return c.JSON(fiber.Map{
		"activities": response,
		"page":       page,
		"limit":      limit,
		"total":      total,
	})
}

// GetGroupActivities returns activities for a specific group
func (h *ActivityHandler) GetGroupActivities(c *fiber.Ctx) error {
	groupID := c.Params("groupId")

	// Get pagination params
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Optional type filter
	activityType := c.Query("type")

	// Build query
	query := database.DB.Where("group_id = ?", groupID)

	if activityType != "" {
		query = query.Where("type = ?", activityType)
	}

	// Get total count
	var total int64
	query.Model(&models.Activity{}).Count(&total)

	// Fetch activities
	var activities []models.Activity
	if err := query.
		Preload("User").
		Preload("TargetUser").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&activities).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch activities"})
	}

	// Get group name
	var group models.Group
	database.DB.Select("name").First(&group, groupID)

	// Build response
	type ActivityResponse struct {
		models.Activity
		GroupName string `json:"group_name"`
	}

	var response []ActivityResponse
	for _, act := range activities {
		response = append(response, ActivityResponse{
			Activity:  act,
			GroupName: group.Name,
		})
	}

	return c.JSON(fiber.Map{
		"activities": response,
		"page":       page,
		"limit":      limit,
		"total":      total,
	})
}
