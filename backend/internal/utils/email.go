package utils

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"mime/multipart"
	"net/smtp"
	"net/textproto"
	"os"
	"path/filepath"
)

const MaxAttachmentSize = 10 * 1024 * 1024 // 10 MB

func SendEmail(to, subject, body string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	fromEmail := os.Getenv("SMTP_FROM")

	if smtpHost == "" || smtpPort == "" || smtpUser == "" || smtpPass == "" {
		return fmt.Errorf("SMTP configuration missing")
	}

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	headers := make(map[string]string)
	headers["From"] = fromEmail
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=\"UTF-8\""

	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + body

	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
	if err := smtp.SendMail(addr, auth, fromEmail, []string{to}, []byte(message)); err != nil {
		return err
	}

	return nil
}

// SendEmailWithAttachment sends an email with an optional file attachment.
// If attachmentPath is empty or file size exceeds MaxAttachmentSize, sends without attachment.
func SendEmailWithAttachment(to, subject, htmlBody, attachmentPath, attachmentName string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	fromEmail := os.Getenv("SMTP_FROM")

	if smtpHost == "" || smtpPort == "" || smtpUser == "" || smtpPass == "" {
		return fmt.Errorf("SMTP configuration missing")
	}

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	// Check if we should include attachment
	includeAttachment := false
	var attachmentData []byte
	if attachmentPath != "" {
		fileInfo, err := os.Stat(attachmentPath)
		if err == nil && fileInfo.Size() <= MaxAttachmentSize {
			data, err := os.ReadFile(attachmentPath)
			if err == nil {
				attachmentData = data
				includeAttachment = true
			}
		}
	}

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Write headers
	buf.WriteString(fmt.Sprintf("From: %s\r\n", fromEmail))
	buf.WriteString(fmt.Sprintf("To: %s\r\n", to))
	buf.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	buf.WriteString("MIME-Version: 1.0\r\n")
	buf.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=%s\r\n\r\n", writer.Boundary()))

	// HTML body part
	htmlHeaders := textproto.MIMEHeader{}
	htmlHeaders.Set("Content-Type", "text/html; charset=UTF-8")
	htmlHeaders.Set("Content-Transfer-Encoding", "7bit")
	htmlPart, _ := writer.CreatePart(htmlHeaders)
	io.WriteString(htmlPart, htmlBody)

	// Attachment part (if applicable)
	if includeAttachment && len(attachmentData) > 0 {
		if attachmentName == "" {
			attachmentName = filepath.Base(attachmentPath)
		}
		attachHeaders := textproto.MIMEHeader{}
		attachHeaders.Set("Content-Type", "application/octet-stream")
		attachHeaders.Set("Content-Transfer-Encoding", "base64")
		attachHeaders.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", attachmentName))
		attachPart, _ := writer.CreatePart(attachHeaders)
		encoded := base64.StdEncoding.EncodeToString(attachmentData)
		// Write in 76-character lines for email compatibility
		for i := 0; i < len(encoded); i += 76 {
			end := i + 76
			if end > len(encoded) {
				end = len(encoded)
			}
			attachPart.Write([]byte(encoded[i:end] + "\r\n"))
		}
	}

	writer.Close()

	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
	if err := smtp.SendMail(addr, auth, fromEmail, []string{to}, buf.Bytes()); err != nil {
		return err
	}

	return nil
}
