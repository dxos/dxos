//
// Copyright 2024 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'login.title': 'Request access or login',
        'existing-identity.title': 'Sign up to access your account',
        'beta.description': 'Drop your email below to request early access to Composer.',

        'check-email.title': 'Please check your email',
        'check-email.description':
          "A login link has been sent to your inbox. If it doesn't arrive in the next three minutes please check your spam folder.",
        'request-access-email.description':
          "A confirmation link has been sent to your inbox. If it doesn't arrive in the next three minutes please check your spam folder.",
        'email-error.message': 'Failed to send verification email.',

        'email-input.label': 'Email',
        'email-input.placeholder': 'Your email',
        'signup-button.label': 'Continue',
        'continue-button.label': 'Continue',
        'send-link-button.label': 'Send link',
        'waitlist-submit-button.label': 'Join the list',

        'login-tab.label': 'Log In',
        'signup-tab.label': 'Sign Up',
        'welcome-back.title': 'Welcome back!',
        'sign-in-with-passkey-button.label': 'Log in with passkey',
        'more-ways-to-sign-in': 'More ways to log in',
        'login-passkey.label': 'Passkey',
        'login-passkey.description': 'The simplest way to access your data on new devices.',
        'login-email.label': 'Email',
        'login-email.description': "We'll send a login link.",
        'login-device.label': 'From another device',
        'login-device.description': 'Scan a QR code from a logged-in device.',
        'login-recovery.label': 'Recovery code',
        'login-recovery.description': 'Use a paper key to recover your identity.',
        'sign-in-with-email.title': 'Log in with email',
        'sign-in-with-email.description': "We'll send you a login link.",
        'get-an-invite': 'New here? Get an invite',

        'signup-code.title': 'Enter your invitation code',
        'signup-code.description': "Codes are 8 characters. We'll verify yours before continuing.",
        'signup-auth.title': 'Set up your account',
        'signup-auth.description': "Enter your email so we can confirm it later. You'll be admitted right away.",
        'no-invitation-code-link': "Don't have a code? Join the waiting list",
        'have-invitation-code-link': 'Have an invitation code? Enter it here',
        'use-different-code-link': 'Use a different invitation code',
        'invitation-code-format-error': 'Codes are 8 characters of A–Z and 0–9 (e.g. XK4F-9P2A).',
        'invitation-code-invalid-error': "That code isn't valid. Check it for typos or request a new one.",

        'waitlist.title': 'Join the waiting list',
        'waitlist.description': "We'll let you know as soon as access opens up.",
        'waitlist-submitted.title': "You're on the list",
        'waitlist-submitted.description': "Thanks — we'll be in touch when an invitation is available.",

        'redeem-passkey-button.label': 'Continue with a passkey',
        'redeem-passkey-button.description': 'The simplest way to access your data on new devices.',
        'join-device-button.label': 'Continue with an existing device',
        'join-device-button.description': 'Authenticate using an existing device.',
        'recover-identity-button.label': 'Continue with a recovery code',
        'recover-identity-button.description': 'Recover your identity using a paper key.',

        'space-invitation.title': 'You have been invited to a space',
        'space-invitation.description':
          "You're not currently logged in on this device, click the button below to create a new account and accept the invitation, or log in on this device before accepting the invitation.",
        'join-space-button.label': 'Create account & accept invitation',
        'go-to-login.title': 'Already have an account?',
        'go-to-login.description':
          'If you already have an account, log in before accepting the invitation with that account.',
        'go-to-login-button.label': 'Go to login',

        'passkey-setup-toast.title': 'Setup a passkey',
        'passkey-setup-toast.description':
          'Setup a passkey to ensure you maintain access to your account and sign in on other devices.',
        'passkey-setup-toast-action.label': 'Setup',
        'passkey-setup-toast-action.alt': 'Navigate to the passkeys management page.',

        'native-redirect.message': 'Opening in the Composer app...',
        'open-in-browser-button.label': 'Open here instead',

        'open-about.label': 'About Composer',
        'version.label': 'Version {{version}}',
        'published.label': 'Published {{timestamp}}',
        'powered-by-dxos.message': 'Powered by <dxos>DXOS</dxos>',
        'close.label': 'Close',
      },
    },
  },
] as const satisfies Resource[];
