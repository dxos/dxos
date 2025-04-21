//
// Copyright 2024 DXOS.org
//

import { WELCOME_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [WELCOME_PLUGIN]: {
        'welcome title': 'Now check your email!',
        'space invitation welcome title': 'Joining a space',
        'space invitation welcome description':
          'You have been invited to join a space. Click the button below to accept the invitation.',
        'check email for access':
          "A login link has been sent to your inbox. If it doesn't arrive in 3 minutes, be sure to check your spam folder.",
        'email error': 'Failed to send verification email.',
        'existing users title': 'Sign up or login',
        'existing users description':
          'If you have already signed-up and created a passkey, click on the button below to access your account.',
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
        'join space button label': 'Accept invitation',
        'space invitation title': "You've been invited to a space",
        'space invitation description':
          'Your space invitation will bypass the beta sign-up process, but you will need to sign-up next time you visit to get permanent access.',

        'passkey setup toast title': 'Setup a passkey',
        'passkey setup toast description':
          'Setup a passkey to ensure you maintain access to your account and sign in on other devices.',
        'passkey setup toast action label': 'Setup',
        'passkey setup toast action alt': 'Navigate to the passkeys management page.',
      },
    },
  },
];
