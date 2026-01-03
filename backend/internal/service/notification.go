package service

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"sync"

	"bytes"
	"encoding/json"
	"net/http"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"

	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
)

type NotificationService struct {
	client *messaging.Client
	mu     sync.RWMutex
}

var notificationService *NotificationService
var once sync.Once

// GetNotificationService returns singleton instance
func GetNotificationService() *NotificationService {
	once.Do(func() {
		notificationService = &NotificationService{}
		notificationService.initialize()
	})
	return notificationService
}

func (s *NotificationService) initialize() {
	ctx := context.Background()

	// Check for service account file path from environment
	credPath := os.Getenv("FIREBASE_CREDENTIALS_PATH")
	if credPath == "" {
		credPath = "firebase-service-account.json"
	}

	// Check if file exists
	if _, err := os.Stat(credPath); os.IsNotExist(err) {
		log.Printf("Firebase credentials file not found at %s. Push notifications disabled.", credPath)
		return
	}

	opt := option.WithCredentialsFile(credPath)
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		log.Printf("Error initializing Firebase app: %v", err)
		return
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		log.Printf("Error getting Messaging client: %v", err)
		return
	}

	s.mu.Lock()
	s.client = client
	s.mu.Unlock()

	log.Println("Firebase Cloud Messaging initialized successfully")
}

// SendToUser sends a notification to a specific user by their ID
func (s *NotificationService) SendToUser(userID uint, title, body string, data map[string]string) error {
	// Get user's FCM token
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		log.Printf("User %d not found for notification", userID)
		return err
	}

	if user.FCMToken == "" {
		log.Printf("User %d has no FCM token", userID)
		return nil
	}

	return s.SendToToken(user.FCMToken, title, body, data)
}

// SendToToken sends a notification to a specific FCM token
func (s *NotificationService) SendToToken(token, title, body string, data map[string]string) error {
	if strings.HasPrefix(token, "ExponentPushToken") {
		return s.sendExpoNotification(token, title, body, data)
	}

	s.mu.RLock()
	client := s.client
	s.mu.RUnlock()

	if client == nil {
		log.Printf("FCM client not initialized and not an Expo token. Notification: %s - %s", title, body)
		return nil
	}

	if token == "" {
		return nil
	}

	message := &messaging.Message{
		Token: token,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Data: data,
		Android: &messaging.AndroidConfig{
			Priority: "high",
			Notification: &messaging.AndroidNotification{
				Sound:       "default",
				ClickAction: "FLUTTER_NOTIFICATION_CLICK",
			},
		},
		APNS: &messaging.APNSConfig{
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					Sound: "default",
					Badge: func() *int { i := 1; return &i }(),
				},
			},
		},
	}

	ctx := context.Background()
	response, err := client.Send(ctx, message)
	if err != nil {
		log.Printf("Error sending notification: %v", err)
		return err
	}

	log.Printf("Notification sent successfully: %s", response)
	return nil
}

type ExpoPushMessage struct {
	To    string            `json:"to"`
	Title string            `json:"title"`
	Body  string            `json:"body"`
	Data  map[string]string `json:"data"`
	Sound string            `json:"sound"`
}

func (s *NotificationService) sendExpoNotification(token, title, body string, data map[string]string) error {
	msg := ExpoPushMessage{
		To:    token,
		Title: title,
		Body:  body,
		Data:  data,
		Sound: "default",
	}

	payload, err := json.Marshal([]ExpoPushMessage{msg})
	if err != nil {
		log.Printf("Error marshaling Expo push message: %v", err)
		return err
	}

	resp, err := http.Post("https://exp.host/--/api/v2/push/send", "application/json", bytes.NewBuffer(payload))
	if err != nil {
		log.Printf("Error sending Expo push notification: %v", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Expo Push API returned status: %s", resp.Status)
		return fmt.Errorf("expo push api invalid status: %s", resp.Status)
	}

	log.Printf("Expo notification sent successfully to %s", token)
	return nil
}

// SendToMultipleUsers sends notifications to multiple users
func (s *NotificationService) SendToMultipleUsers(userIDs []uint, title, body string, data map[string]string) {
	for _, userID := range userIDs {
		go s.SendToUser(userID, title, body, data)
	}
}

// NotifyGroupMembers sends notification to all members of a group except the actor
func (s *NotificationService) NotifyGroupMembers(groupID uint, excludeUserID uint, title, body string, data map[string]string) {
	var group models.Group
	if err := database.DB.Preload("Members").First(&group, groupID).Error; err != nil {
		log.Printf("Group %d not found for notification", groupID)
		return
	}

	for _, member := range group.Members {
		if member.ID != excludeUserID {
			go s.SendToUser(member.ID, title, body, data)
		}
	}
}

// Specific notification methods for different events

// NotifyMemberAdded notifies group members when a new member joins
func (s *NotificationService) NotifyMemberAdded(groupID uint, newMemberID uint, newMemberName, groupName string) {
	data := map[string]string{
		"type":     "member_added",
		"group_id": uintToString(groupID),
	}
	title := groupName
	body := newMemberName + " joined the group"
	s.NotifyGroupMembers(groupID, newMemberID, title, body, data)
}

// NotifyExpenseAdded notifies group members when an expense is added
func (s *NotificationService) NotifyExpenseAdded(groupID uint, actorID uint, actorName, expenseTitle string, amount float64, groupName string) {
	data := map[string]string{
		"type":     "expense_added",
		"group_id": uintToString(groupID),
	}
	title := groupName
	body := actorName + " added \"" + expenseTitle + "\" - ₹" + formatAmount(amount)
	s.NotifyGroupMembers(groupID, actorID, title, body, data)
}

// NotifyExpenseEdited notifies group members when an expense is edited
func (s *NotificationService) NotifyExpenseEdited(groupID uint, actorID uint, actorName, expenseTitle, changes string, groupName string) {
	data := map[string]string{
		"type":     "expense_edited",
		"group_id": uintToString(groupID),
	}
	title := groupName
	body := actorName + " edited \"" + expenseTitle + "\""
	if changes != "" {
		body += " - " + changes
	}
	s.NotifyGroupMembers(groupID, actorID, title, body, data)
}

// NotifySettlementCreated notifies the receiver when a settlement request is created
func (s *NotificationService) NotifySettlementCreated(receiverID uint, payerName string, amount float64, groupName string, groupID uint) {
	data := map[string]string{
		"type":     "settlement_created",
		"group_id": uintToString(groupID),
	}
	title := "Payment Received"
	body := payerName + " recorded a payment of ₹" + formatAmount(amount) + " in " + groupName
	s.SendToUser(receiverID, title, body, data)
}

// NotifySettlementConfirmed notifies the payer when their settlement is confirmed
func (s *NotificationService) NotifySettlementConfirmed(payerID uint, receiverName string, amount float64, groupName string, groupID uint) {
	data := map[string]string{
		"type":     "settlement_confirmed",
		"group_id": uintToString(groupID),
	}
	title := "Payment Confirmed"
	body := receiverName + " confirmed your payment of ₹" + formatAmount(amount) + " in " + groupName
	s.SendToUser(payerID, title, body, data)
}

// Helper functions
func uintToString(n uint) string {
	return strconv.FormatUint(uint64(n), 10)
}

func formatAmount(amount float64) string {
	return fmt.Sprintf("%.0f", amount)
}
