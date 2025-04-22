//
// Copyright 2024 DXOS.org
//

import { WELCOME_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [WELCOME_PLUGIN]: {
        'welcome title': 'Now check your email!',
        'check email for access':
          "A login link has been sent to your inbox. If it doesn't arrive in 3 minutes, be sure to check your spam folder.",
        'email error': 'Failed to send verification email.',
        'login title': 'Sign up or login',
        'existing identity title': 'Sign up to access your account',
        'name label': 'Name',
        'name placeholder': 'Your name',
        'email input label': 'Email',
        'email input placeholder': 'Your email',
        'signup button label': 'Continue',
        'redeem passkey button label': 'Continue with a passkey',
        'redeem passkey button description': 'The simplest way to access your data on new devices.',
        'join device button label': 'Continue with an existing device',
        'join device button description': 'Authenticate using an existing device.',
        'recover identity button label': 'Continue with a recovery code',
        'recover identity button description': 'Recover your identity using a paper key.',

        'space invitation title': "You've been invited to a space",
        'space invitation description':
          "You're not currently logged in on this device, click the button below to create a new account and accept the invitation, or log in on this device before accepting the invitation.",
        'join space button label': 'Create account & accept invitation',
        'go to login title': 'Already have an account?',
        'go to login description': 'If you already have an account, log in to accept the invitation with that account.',
        'go to login button label': 'Go to login',

        'passkey setup toast title': 'Setup a passkey',
        'passkey setup toast description':
          'Setup a passkey to ensure you maintain access to your account and sign in on other devices.',
        'passkey setup toast action label': 'Setup',
        'passkey setup toast action alt': 'Navigate to the passkeys management page.',
      },
    },
  },
];
