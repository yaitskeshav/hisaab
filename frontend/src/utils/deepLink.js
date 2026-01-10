import * as Linking from 'expo-linking';

/**
 * Robustly parses a deep link URL to extract screen name and parameters.
 * Handles variations in hostname/path structure across different platforms and deep link formats.
 */
export const parseDeepLink = (url) => {
    if (!url) return null;

    try {
        const parsed = Linking.parse(url);

        // Handle Password Rest
        if (parsed.path === 'reset-password' || parsed.hostname === 'reset-password') {
            return {
                screen: 'ResetPassword',
                params: { token: parsed.queryParams?.token },
            };
        }

        // Handle Forgot Password
        if (parsed.path === 'forgot-password' || parsed.hostname === 'forgot-password') {
            return { screen: 'ForgotPassword' };
        }

        // Handle Login
        if (parsed.path === 'login' || parsed.hostname === 'login') {
            return { screen: 'Login' };
        }

        // Handle Group Invite
        // Format: hisaab://invite/TOKEN or hisaab://invite?token=TOKEN
        if (parsed.path?.startsWith('invite/') || parsed.hostname === 'invite') {
            let token = parsed.queryParams?.token;
            if (!token) {
                if (parsed.path?.startsWith('invite/')) {
                    token = parsed.path.split('/')[1];
                } else if (parsed.hostname === 'invite' && parsed.path) {
                    // Path could be the token itself if 'invite' is the hostname
                    token = parsed.path;
                }
            }
            return { screen: 'Invite', params: { token } };
        }

        // Handle Email Verification
        // Format: hisaab://verify-email?token=TOKEN
        if (parsed.path === 'verify-email' || parsed.hostname === 'verify-email') {
            return {
                screen: 'VerifyEmail',
                params: { token: parsed.queryParams?.token },
            };
        }

        return null;
    } catch (e) {
        console.error('deepLinkUtil: Error parsing deep link:', e);
        return null;
    }
};
