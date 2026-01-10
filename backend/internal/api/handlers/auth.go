package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hisaab/backend/internal/database"
	"github.com/hisaab/backend/internal/models"
	"github.com/hisaab/backend/internal/utils"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

type SignupRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

func (h *AuthHandler) Signup(c *fiber.Ctx) error {
	req := new(SignupRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash password"})
	}

	// Generate email verification token
	verificationToken := utils.GenerateRandomString(32)

	user := models.User{
		Email:                      req.Email,
		Password:                   string(hashedPassword),
		Name:                       utils.ToTitleCase(req.Name),
		EmailVerificationToken:     verificationToken,
		EmailVerificationExpiresAt: time.Now().Add(24 * time.Hour),
		IsEmailVerified:            false,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "user already exists"})
	}

	// Send verification email async
	go h.sendVerificationEmail(user.Email, user.Name, verificationToken)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Verification email sent. Please check your inbox.",
		"email":   user.Email,
	})
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	req := new(LoginRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
	}

	// Block login if email not verified (only for non-Google users)
	if user.GoogleID == nil && !user.IsEmailVerified {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "email_not_verified",
			"email": user.Email,
		})
	}

	accessToken, refreshToken, err := utils.GenerateTokens(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate tokens"})
	}

	user.RefreshToken = refreshToken
	database.DB.Save(&user)

	return c.JSON(fiber.Map{
		"user":          user,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	claims, err := utils.ValidateToken(body.RefreshToken, true)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid refresh token"})
	}

	var user models.User
	if err := database.DB.First(&user, claims.UserID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "user not found"})
	}

	if user.RefreshToken != body.RefreshToken {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid refresh token"})
	}

	accessToken, refreshToken, err := utils.GenerateTokens(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate tokens"})
	}

	user.RefreshToken = refreshToken
	database.DB.Save(&user)

	return c.JSON(fiber.Map{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

type UpdateProfileRequest struct {
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
}

func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	req := new(UpdateProfileRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	// Update fields
	if req.Name != "" {
		user.Name = req.Name
	}
	if req.AvatarURL != "" {
		user.AvatarURL = req.AvatarURL
	}

	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update profile"})
	}

	return c.JSON(user)
}

func (h *AuthHandler) UploadAvatar(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	// Get the uploaded file
	file, err := c.FormFile("avatar")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no file uploaded"})
	}

	// Validate file type
	ext := filepath.Ext(file.Filename)
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowedExts[ext] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid file type. Allowed: jpg, jpeg, png, gif, webp"})
	}

	// Create avatars directory if not exists
	avatarDir := "./uploads/avatars"
	if err := os.MkdirAll(avatarDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create directory"})
	}

	// Delete old avatar if exists
	if user.AvatarURL != "" {
		oldPath := "." + user.AvatarURL
		os.Remove(oldPath)
	}

	// Generate unique filename
	filename := fmt.Sprintf("avatar_%d_%d%s", userID, time.Now().Unix(), ext)
	filePath := filepath.Join(avatarDir, filename)

	// Save file
	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save file"})
	}

	// Update user avatar URL
	user.AvatarURL = "/uploads/avatars/" + filename
	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update profile"})
	}

	return c.JSON(user)
}

func (h *AuthHandler) DeleteAvatar(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	// Delete old avatar file if exists (only local files, not external URLs)
	if user.AvatarURL != "" && len(user.AvatarURL) >= 4 && user.AvatarURL[:4] != "http" {
		oldPath := "." + user.AvatarURL
		os.Remove(oldPath)
	}

	// Clear avatar URL
	user.AvatarURL = ""
	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update profile"})
	}

	return c.JSON(user)
}

// Google OAuth

type GoogleLoginRequest struct {
	Token string `json:"token"`
}

type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

func (h *AuthHandler) GoogleLogin(c *fiber.Ctx) error {
	req := new(GoogleLoginRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	if req.Token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "token is required"})
	}

	// Verify token with Google
	googleUser, err := verifyGoogleToken(req.Token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid google token"})
	}

	// Find or create user
	var user models.User
	result := database.DB.Where("google_id = ?", googleUser.ID).Or("email = ?", googleUser.Email).First(&user)

	if result.Error != nil {
		// Create new user
		user = models.User{
			Email:     googleUser.Email,
			Name:      utils.ToTitleCase(googleUser.Name),
			GoogleID:  &googleUser.ID,
			AvatarURL: googleUser.Picture,
		}
		if err := database.DB.Create(&user).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create user"})
		}
	} else {
		// Update existing user's Google ID if not set
		if user.GoogleID == nil {
			user.GoogleID = &googleUser.ID
		}
		// Update avatar if user doesn't have one
		if user.AvatarURL == "" && googleUser.Picture != "" {
			user.AvatarURL = googleUser.Picture
		}
		database.DB.Save(&user)
	}

	// Generate tokens
	accessToken, refreshToken, err := utils.GenerateTokens(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate tokens"})
	}

	user.RefreshToken = refreshToken
	database.DB.Save(&user)

	return c.JSON(fiber.Map{
		"user":          user,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

func verifyGoogleToken(token string) (*GoogleUserInfo, error) {
	// Try ID token verification first (from useIdTokenAuthRequest)
	resp, err := http.Get("https://oauth2.googleapis.com/tokeninfo?id_token=" + token)
	if err == nil && resp.StatusCode == http.StatusOK {
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)

		var tokenInfo struct {
			Sub     string `json:"sub"`
			Email   string `json:"email"`
			Name    string `json:"name"`
			Picture string `json:"picture"`
		}
		if json.Unmarshal(body, &tokenInfo) == nil && tokenInfo.Email != "" {
			return &GoogleUserInfo{
				ID:      tokenInfo.Sub,
				Email:   tokenInfo.Email,
				Name:    tokenInfo.Name,
				Picture: tokenInfo.Picture,
			}, nil
		}
	}
	if resp != nil {
		resp.Body.Close()
	}

	// Fallback: try as access token (from useAuthRequest)
	resp, err = http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + token)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google token verification failed")
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var userInfo GoogleUserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, err
	}

	if userInfo.Email == "" {
		return nil, fmt.Errorf("email not found in google response")
	}

	return &userInfo, nil
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	req := new(ForgotPasswordRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Do not reveal if user exists
		return c.JSON(fiber.Map{"message": "If this email is registered, you will receive a password reset link"})
	}

	// Generate and save reset token (using uuid for simplicity)
	resetToken := utils.GenerateRandomString(32)
	user.ResetToken = resetToken
	user.ResetTokenExpiresAt = time.Now().Add(1 * time.Hour) // 1 hour expiry
	database.DB.Save(&user)

	// Send email

	// Send email
	apiServiceURL := os.Getenv("BACKEND_URL")
	if apiServiceURL == "" {
		apiServiceURL = "http://localhost:3000" // Fallback for dev
	}
	resetLink := fmt.Sprintf("%s/api/v1/auth/reset-redirect?token=%s", apiServiceURL, resetToken)

	emailBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Hisaab</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background-color: #0F172A;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width: 480px;">
                    <!-- Logo -->
                    <tr>
                        <td align="center" style="padding-bottom: 32px;">
                            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #00F3D1 0%%, #0099F7 100%%); border-radius: 16px; display: inline-block;">
                                <table role="presentation" width="64" height="64" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center" valign="middle" style="color: white; font-size: 28px;">
                                            ≡
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            <p style="margin: 12px 0 0 0; font-size: 20px; font-weight: 700; color: #F8FAFC;">hisaab</p>
                        </td>
                    </tr>

                    <!-- Card -->
                    <tr>
                        <td style="background: rgba(30, 41, 59, 0.95); border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.1);">
                            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="padding: 40px 32px;">
                                        <!-- Icon -->
                                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td align="center" style="padding-bottom: 24px;">
                                                    <div style="width: 56px; height: 56px; background: rgba(59, 130, 246, 0.2); border-radius: 50%%; display: inline-block;">
                                                        <table role="presentation" width="56" height="56" cellspacing="0" cellpadding="0">
                                                            <tr>
                                                                <td align="center" valign="middle" style="color: #3B82F6; font-size: 24px;">
                                                                    🔑
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Title -->
                                        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #F8FAFC; text-align: center;">
                                            Reset Your Password
                                        </h1>

                                        <!-- Greeting -->
                                        <p style="margin: 0 0 20px 0; font-size: 15px; color: #94A3B8; text-align: center; line-height: 1.5;">
                                            Hi %s, we received a request to reset the password for your Hisaab account.
                                        </p>

                                        <!-- Button -->
                                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td align="center" style="padding: 24px 0;">
                                                    <a href="%s" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3B82F6 0%%, #2563EB 100%%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px;">
                                                        Reset Password
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Info box -->
                                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background: rgba(255, 255, 255, 0.05); border-radius: 12px;">
                                            <tr>
                                                <td style="padding: 16px;">
                                                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748B; text-align: center;">
                                                        Or copy this link to your browser:
                                                    </p>
                                                    <p style="margin: 0; font-size: 12px; color: #3B82F6; text-align: center; word-break: break-all;">
                                                        %s
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Expiry note -->
                                        <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748B; text-align: center;">
                                            ⏱️ This link expires in 1 hour
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Security note -->
                    <tr>
                        <td style="padding: 24px 0;">
                            <p style="margin: 0; font-size: 13px; color: #475569; text-align: center; line-height: 1.5;">
                                If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <p style="margin: 0; font-size: 12px; color: #475569;">
                                © %d Hisaab · Split today. Settle tomorrow.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
	`, user.Name, resetLink, resetLink, time.Now().Year())

	go func() {
		if err := utils.SendEmail(user.Email, "Reset Your Password - Hisaab", emailBody); err != nil {
			fmt.Printf("Failed to send email to %s: %v\n", user.Email, err)
		} else {
			fmt.Printf("Reset email sent to %s\n", user.Email)
		}
	}()

	return c.JSON(fiber.Map{"message": "If this email is registered, you will receive a password reset link"})
}

func (h *AuthHandler) ResetPasswordRedirect(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return c.SendString("Invalid token")
	}

	// Check if token is valid before showing the form
	var user models.User
	tokenValid := database.DB.Where("reset_token = ?", token).First(&user).Error == nil
	if !tokenValid || time.Now().After(user.ResetTokenExpiresAt) {
		tokenValid = false
	}

	backendURL := os.Getenv("BACKEND_URL")
	if backendURL == "" {
		backendURL = "http://localhost:3000"
	}

	// Beautiful responsive page that works for both mobile and desktop
	html := fmt.Sprintf(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - Hisaab</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-height: 100vh;
            background: linear-gradient(135deg, #0F172A 0%%, #020617 100%%);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .container {
            width: 100%%;
            max-width: 420px;
        }

        .logo-container {
            text-align: center;
            margin-bottom: 32px;
        }

        .logo {
            width: 72px;
            height: 72px;
            background: linear-gradient(135deg, #00F3D1 0%%, #0099F7 100%%);
            border-radius: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
        }

        .logo svg {
            width: 36px;
            height: 36px;
            color: white;
        }

        .brand-name {
            font-size: 24px;
            font-weight: 700;
            color: #F8FAFC;
            margin-bottom: 8px;
        }

        .card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 24px;
            padding: 32px;
        }

        h1 {
            font-size: 24px;
            font-weight: 700;
            color: #F8FAFC;
            text-align: center;
            margin-bottom: 8px;
        }

        .subtitle {
            font-size: 14px;
            color: #64748B;
            text-align: center;
            margin-bottom: 24px;
            line-height: 1.5;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #CBD5E1;
            margin-bottom: 8px;
        }

        .input-wrapper {
            position: relative;
        }

        input {
            width: 100%%;
            padding: 14px 16px;
            padding-right: 48px;
            font-size: 16px;
            color: #F8FAFC;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            outline: none;
            transition: all 0.2s ease;
        }

        input:focus {
            border-color: #3B82F6;
            background: rgba(255, 255, 255, 0.15);
        }

        input::placeholder {
            color: #64748B;
        }

        .toggle-password {
            position: absolute;
            right: 16px;
            top: 50%%;
            transform: translateY(-50%%);
            background: none;
            border: none;
            cursor: pointer;
            color: #64748B;
            padding: 4px;
        }

        .toggle-password:hover {
            color: #CBD5E1;
        }

        .strength-container {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 8px;
        }

        .strength-bars {
            display: flex;
            gap: 4px;
            flex: 1;
        }

        .strength-bar {
            flex: 1;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            transition: background 0.2s ease;
        }

        .strength-label {
            font-size: 12px;
            font-weight: 500;
            min-width: 70px;
            text-align: right;
        }

        .match-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 8px;
            font-size: 12px;
            font-weight: 500;
        }

        .btn {
            width: 100%%;
            padding: 16px;
            font-size: 16px;
            font-weight: 600;
            color: white;
            background: linear-gradient(135deg, #3B82F6 0%%, #2563EB 100%%);
            border: none;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .btn-outline {
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .btn-outline:hover {
            background: rgba(255, 255, 255, 0.1);
            box-shadow: none;
        }

        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .requirements {
            margin-top: 20px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
        }

        .requirements-title {
            font-size: 12px;
            color: #64748B;
            margin-bottom: 8px;
        }

        .requirement {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: #64748B;
            margin-bottom: 4px;
        }

        .requirement.met {
            color: #CBD5E1;
        }

        .requirement svg {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }

        /* Success State */
        .success-container {
            text-align: center;
            padding: 20px 0;
        }

        .success-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #10B981 0%%, #059669 100%%);
            border-radius: 50%%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
            animation: scaleIn 0.5s ease;
        }

        .success-icon svg {
            width: 40px;
            height: 40px;
            color: white;
        }

        @keyframes scaleIn {
            0%% { transform: scale(0); opacity: 0; }
            100%% { transform: scale(1); opacity: 1; }
        }

        .success-title {
            font-size: 24px;
            font-weight: 700;
            color: #F8FAFC;
            margin-bottom: 8px;
        }

        .success-text {
            font-size: 14px;
            color: #64748B;
            margin-bottom: 24px;
        }

        /* Error State */
        .error-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #EF4444 0%%, #DC2626 100%%);
            border-radius: 50%%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
        }

        /* Mobile view */
        .mobile-view {
            text-align: center;
            padding: 20px 0;
        }

        .mobile-view p {
            color: #64748B;
            font-size: 14px;
            margin-bottom: 20px;
        }

        .divider {
            display: flex;
            align-items: center;
            margin: 24px 0;
            color: #64748B;
            font-size: 12px;
        }

        .divider::before,
        .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
        }

        .divider span {
            padding: 0 16px;
        }

        .hidden { display: none; }

        .error-text {
            color: #EF4444;
            font-size: 12px;
            margin-top: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-container">
            <div class="logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
            </div>
            <div class="brand-name">hisaab</div>
        </div>

        <div class="card">
            <!-- Invalid Token State -->
            <div id="invalidState" class="%s">
                <div class="success-container">
                    <div class="error-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h2 class="success-title">Link Expired</h2>
                    <p class="success-text">This password reset link is invalid or has expired.<br>Please request a new one.</p>
                    <a href="hisaab://forgot-password" class="btn" style="text-decoration: none; margin-bottom: 12px;">Open App</a>
                </div>
            </div>

            <!-- Mobile View - Try App First -->
            <div id="mobileView" class="hidden">
                <div class="mobile-view">
                    <h1>Reset Password</h1>
                    <p class="subtitle">Opening the Hisaab app...</p>
                    <a href="hisaab://reset-password?token=%s" class="btn" style="text-decoration: none;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        Open in App
                    </a>
                    <div class="divider"><span>or reset here</span></div>
                    <button class="btn btn-outline" onclick="showDesktopForm()">Reset in Browser</button>
                </div>
            </div>

            <!-- Desktop Form -->
            <div id="desktopView" class="%s">
                <h1>Create new password</h1>
                <p class="subtitle">Your new password must be different from previously used passwords.</p>

                <form id="resetForm" onsubmit="handleSubmit(event)">
                    <div class="form-group">
                        <label>New Password</label>
                        <div class="input-wrapper">
                            <input type="password" id="password" placeholder="Enter new password" oninput="updateStrength()">
                            <button type="button" class="toggle-password" onclick="togglePassword('password')">
                                <svg id="eyeIcon1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>
                        <div class="strength-container">
                            <div class="strength-bars">
                                <div class="strength-bar" id="bar1"></div>
                                <div class="strength-bar" id="bar2"></div>
                                <div class="strength-bar" id="bar3"></div>
                                <div class="strength-bar" id="bar4"></div>
                                <div class="strength-bar" id="bar5"></div>
                            </div>
                            <span class="strength-label" id="strengthLabel"></span>
                        </div>
                        <div id="passwordError" class="error-text hidden"></div>
                    </div>

                    <div class="form-group">
                        <label>Confirm Password</label>
                        <div class="input-wrapper">
                            <input type="password" id="confirmPassword" placeholder="Confirm new password" oninput="checkMatch()">
                            <button type="button" class="toggle-password" onclick="togglePassword('confirmPassword')">
                                <svg id="eyeIcon2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>
                        <div id="matchIndicator" class="match-indicator hidden"></div>
                        <div id="confirmError" class="error-text hidden"></div>
                    </div>

                    <button type="submit" class="btn" id="submitBtn">
                        <span id="btnText">Reset Password</span>
                        <div id="btnSpinner" class="spinner hidden"></div>
                    </button>
                </form>

                <div class="requirements">
                    <div class="requirements-title">Password requirements:</div>
                    <div class="requirement" id="req1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                        <span>At least 8 characters</span>
                    </div>
                    <div class="requirement" id="req2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                        <span>One uppercase letter</span>
                    </div>
                    <div class="requirement" id="req3">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                        <span>One number</span>
                    </div>
                    <div class="requirement" id="req4">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                        <span>One special character</span>
                    </div>
                </div>
            </div>

            <!-- Success State -->
            <div id="successView" class="hidden">
                <div class="success-container">
                    <div class="success-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <h2 class="success-title">Password Reset!</h2>
                    <p class="success-text">Your password has been successfully updated.<br>You can now login with your new password.</p>
                    <a href="hisaab://login" class="btn" style="text-decoration: none;">Open App to Login</a>
                </div>
            </div>
        </div>
    </div>

    <script>
        const token = '%s';
        const apiUrl = '%s/api/v1/auth/reset-password';
        const tokenValid = %t;

        // Detect mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        window.onload = function() {
            if (!tokenValid) {
                document.getElementById('invalidState').classList.remove('hidden');
                document.getElementById('desktopView').classList.add('hidden');
                return;
            }

            if (isMobile) {
                document.getElementById('mobileView').classList.remove('hidden');
                document.getElementById('desktopView').classList.add('hidden');
                // Try to open app
                setTimeout(() => {
                    window.location.href = 'hisaab://reset-password?token=' + token;
                }, 500);
            }
        };

        function showDesktopForm() {
            document.getElementById('mobileView').classList.add('hidden');
            document.getElementById('desktopView').classList.remove('hidden');
        }

        function togglePassword(inputId) {
            const input = document.getElementById(inputId);
            const icon = inputId === 'password' ? document.getElementById('eyeIcon1') : document.getElementById('eyeIcon2');
            if (input.type === 'password') {
                input.type = 'text';
                icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
            } else {
                input.type = 'password';
                icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
            }
        }

        function updateStrength() {
            const password = document.getElementById('password').value;
            let strength = 0;

            if (password.length >= 8) strength++;
            if (password.length >= 12) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;

            const colors = ['', '#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981'];
            const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

            for (let i = 1; i <= 5; i++) {
                const bar = document.getElementById('bar' + i);
                bar.style.background = i <= strength ? colors[strength] : 'rgba(255, 255, 255, 0.1)';
            }

            const label = document.getElementById('strengthLabel');
            label.textContent = password ? labels[strength] : '';
            label.style.color = colors[strength];

            // Update requirements
            updateRequirement('req1', password.length >= 8);
            updateRequirement('req2', /[A-Z]/.test(password));
            updateRequirement('req3', /[0-9]/.test(password));
            updateRequirement('req4', /[^A-Za-z0-9]/.test(password));

            checkMatch();
        }

        function updateRequirement(id, met) {
            const el = document.getElementById(id);
            const svg = el.querySelector('svg');
            if (met) {
                el.classList.add('met');
                svg.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
                svg.style.color = '#10B981';
            } else {
                el.classList.remove('met');
                svg.innerHTML = '<circle cx="12" cy="12" r="10"></circle>';
                svg.style.color = '';
            }
        }

        function checkMatch() {
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirmPassword').value;
            const indicator = document.getElementById('matchIndicator');

            if (!confirm) {
                indicator.classList.add('hidden');
                return;
            }

            indicator.classList.remove('hidden');
            if (password === confirm) {
                indicator.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><span style="color: #10B981;">Passwords match</span>';
            } else {
                indicator.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg><span style="color: #EF4444;">Passwords do not match</span>';
            }
        }

        async function handleSubmit(e) {
            e.preventDefault();

            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirmPassword').value;
            const passwordError = document.getElementById('passwordError');
            const confirmError = document.getElementById('confirmError');

            // Reset errors
            passwordError.classList.add('hidden');
            confirmError.classList.add('hidden');

            // Validate
            if (!password || password.length < 8) {
                passwordError.textContent = 'Password must be at least 8 characters';
                passwordError.classList.remove('hidden');
                return;
            }

            if (password !== confirm) {
                confirmError.textContent = 'Passwords do not match';
                confirmError.classList.remove('hidden');
                return;
            }

            // Show loading
            const btn = document.getElementById('submitBtn');
            const btnText = document.getElementById('btnText');
            const spinner = document.getElementById('btnSpinner');

            btn.disabled = true;
            btnText.textContent = 'Resetting...';
            spinner.classList.remove('hidden');

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: token, password: password })
                });

                const data = await response.json();

                if (response.ok) {
                    document.getElementById('desktopView').classList.add('hidden');
                    document.getElementById('successView').classList.remove('hidden');
                } else {
                    passwordError.textContent = data.error || 'Something went wrong. Please try again.';
                    passwordError.classList.remove('hidden');
                    btn.disabled = false;
                    btnText.textContent = 'Reset Password';
                    spinner.classList.add('hidden');
                }
            } catch (err) {
                passwordError.textContent = 'Network error. Please check your connection.';
                passwordError.classList.remove('hidden');
                btn.disabled = false;
                btnText.textContent = 'Reset Password';
                spinner.classList.add('hidden');
            }
        }
    </script>
</body>
</html>
	`, func() string {
		if tokenValid {
			return "hidden"
		} else {
			return ""
		}
	}(), token, func() string {
		if tokenValid {
			return ""
		} else {
			return "hidden"
		}
	}(), token, backendURL, tokenValid)

	c.Set("Content-Type", "text/html")
	return c.SendString(html)
}

type ResetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	req := new(ResetPasswordRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	var user models.User
	if err := database.DB.Where("reset_token = ?", req.Token).First(&user).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid or expired token"})
	}

	if time.Now().After(user.ResetTokenExpiresAt) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "token expired"})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash password"})
	}

	user.Password = string(hashedPassword)
	user.ResetToken = ""
	user.ResetTokenExpiresAt = time.Time{} // Clear expiry
	database.DB.Save(&user)

	return c.JSON(fiber.Map{"message": "Password updated successfully"})
}

// UpdateFCMToken updates the user's FCM token for push notifications
func (h *AuthHandler) UpdateFCMToken(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	type FCMTokenRequest struct {
		Token string `json:"fcm_token"`
	}

	req := new(FCMTokenRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Update("fcm_token", req.Token).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update FCM token"})
	}

	return c.JSON(fiber.Map{"message": "FCM token updated"})
}

// sendVerificationEmail sends verification email to user
func (h *AuthHandler) sendVerificationEmail(email, name, token string) {
	verifyLink := fmt.Sprintf("hisaab://verify-email?token=%s", token)

	emailBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - Hisaab</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background-color: #0F172A;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width: 480px;">
                    <!-- Logo -->
                    <tr>
                        <td align="center" style="padding-bottom: 32px;">
                            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #00F3D1 0%%, #0099F7 100%%); border-radius: 16px; display: inline-block;">
                                <table role="presentation" width="64" height="64" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center" valign="middle" style="color: white; font-size: 28px;">
                                            ≡
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            <p style="margin: 12px 0 0 0; font-size: 20px; font-weight: 700; color: #F8FAFC;">hisaab</p>
                        </td>
                    </tr>

                    <!-- Card -->
                    <tr>
                        <td style="background: rgba(30, 41, 59, 0.95); border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.1);">
                            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="padding: 40px 32px;">
                                        <!-- Icon -->
                                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td align="center" style="padding-bottom: 24px;">
                                                    <div style="width: 56px; height: 56px; background: rgba(16, 185, 129, 0.2); border-radius: 50%%; display: inline-block;">
                                                        <table role="presentation" width="56" height="56" cellspacing="0" cellpadding="0">
                                                            <tr>
                                                                <td align="center" valign="middle" style="color: #10B981; font-size: 24px;">
                                                                    ✉️
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Title -->
                                        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #F8FAFC; text-align: center;">
                                            Verify Your Email
                                        </h1>

                                        <!-- Greeting -->
                                        <p style="margin: 0 0 20px 0; font-size: 15px; color: #94A3B8; text-align: center; line-height: 1.5;">
                                            Hi %s, welcome to Hisaab! Please verify your email address to get started.
                                        </p>

                                        <!-- Button -->
                                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td align="center" style="padding: 24px 0;">
                                                    <a href="%s" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #10B981 0%%, #059669 100%%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px;">
                                                        Verify Email
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Info box -->
                                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background: rgba(255, 255, 255, 0.05); border-radius: 12px;">
                                            <tr>
                                                <td style="padding: 16px;">
                                                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748B; text-align: center;">
                                                        Or copy this link to your browser:
                                                    </p>
                                                    <p style="margin: 0; font-size: 12px; color: #10B981; text-align: center; word-break: break-all;">
                                                        %s
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Expiry note -->
                                        <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748B; text-align: center;">
                                            ⏱️ This link expires in 24 hours
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Security note -->
                    <tr>
                        <td style="padding: 24px 0;">
                            <p style="margin: 0; font-size: 13px; color: #475569; text-align: center; line-height: 1.5;">
                                If you didn't create an account with Hisaab, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <p style="margin: 0; font-size: 12px; color: #475569;">
                                © %d Hisaab · Split today. Settle tomorrow.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
	`, name, verifyLink, verifyLink, time.Now().Year())

	if err := utils.SendEmail(email, "Verify Your Email - Hisaab", emailBody); err != nil {
		fmt.Printf("Failed to send verification email to %s: %v\n", email, err)
	} else {
		fmt.Printf("Verification email sent to %s\n", email)
	}
}

type VerifyEmailRequest struct {
	Token string `json:"token"`
}

// VerifyEmail verifies user's email address
func (h *AuthHandler) VerifyEmail(c *fiber.Ctx) error {
	req := new(VerifyEmailRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	var user models.User
	if err := database.DB.Where("email_verification_token = ?", req.Token).First(&user).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid or expired token"})
	}

	if time.Now().After(user.EmailVerificationExpiresAt) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "token expired"})
	}

	// Mark email as verified and clear token
	user.IsEmailVerified = true
	user.EmailVerificationToken = ""
	user.EmailVerificationExpiresAt = time.Time{}

	// Generate tokens for the user
	accessToken, refreshToken, err := utils.GenerateTokens(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate tokens"})
	}

	user.RefreshToken = refreshToken
	database.DB.Save(&user)

	return c.JSON(fiber.Map{
		"message":       "Email verified successfully",
		"user":          user,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

type ResendVerificationRequest struct {
	Email string `json:"email"`
}

// ResendVerification resends verification email
func (h *AuthHandler) ResendVerification(c *fiber.Ctx) error {
	req := new(ResendVerificationRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Don't reveal if user exists
		return c.JSON(fiber.Map{"message": "If this email is registered, you will receive a verification link"})
	}

	if user.IsEmailVerified {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "email already verified"})
	}

	// Generate new verification token
	verificationToken := utils.GenerateRandomString(32)
	user.EmailVerificationToken = verificationToken
	user.EmailVerificationExpiresAt = time.Now().Add(24 * time.Hour)
	database.DB.Save(&user)

	// Send verification email async
	go h.sendVerificationEmail(user.Email, user.Name, verificationToken)

	return c.JSON(fiber.Map{"message": "If this email is registered, you will receive a verification link"})
}
