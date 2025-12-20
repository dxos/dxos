//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'account label': 'User profile',
        'profile label': 'Profile',
        'profile description': 'You can adjust how your user settings here.',
        'devices label': 'Devices',
        'devices verbose label': 'Manage devices',
        'add device description':
          'Authenticating another device is a two-step process. To get started, create a code using the button below.',
        'devices description':
          'You can add and remove devices, configure your agent in the cloud, reset this device, or log in as a different identity here.',
        'create device invitation label': 'Create code',
        'qr code description':
          'Scan this QR code using the device you want to log in to, or copy the URL and share it with the new device.',
        'security label': 'Security',
        'reset device description': 'Log out from this device, erasing all the data on this device.',
        'join new identity description':
          'Log out from this device, erasing all the data currently on this device, and use a QR code or URL to log in.',
        'recover identity description':
          'Log out from this device, erasing all the data currently on this device, and use a passkey or recovery code to log in.',
        'danger zone title': 'Log out',
        'danger zone description':
          'Because Composer is decentralized, logging out entails erasing all the data on this device. If you have any data on this device that you’d like to keep, you can log in on a separate device using a passkey or complete a peer-to-peer device invitation above.',
        'display name label': 'Display name',
        'display name description': 'Your name as it appears in the app.',
        'display name input placeholder': 'Enter a name',
        'icon label': 'Avatar',
        'icon description': 'The emoji used to represent you in the app.',
        'hue label': 'Color',
        'hue description':
          'The color used to represent you in the app, including as your avatar’s background, your cursor as it appears to others, and the messages you send in group threads.',
        'did label': 'DID',
        'did description': 'Your unique ID.',
        'open user account label': 'Open user account',
        'manage credentials dialog title': 'Manage Account Recovery',
        'credentials list label': 'Recovery credentials',
        'no credentials title': 'WARNING: There is currently no way to recover your account.',
        'no credentials message': 'Create a recovery credential above to secure your account.',
        'recovery setup dialog title': 'Account Security',
        'recovery setup dialog description':
          'In order to maintain access to your account you need to register a recovery credential. Passkeys are the recommended way to do this, they can be stored in your browser or in a password manager.',
        'create passkey label': 'Create Passkey',
        // TODO(wittjosiah): At link to user-focused passkey information.
        //   Something like https://www.tomsguide.com/news/what-are-passkeys.
        'create passkey description':
          'A passkey is a secure and easy to use credential that can be used to recover your account.',
        'create recovery code label': 'Create Recovery Code',
        'create recovery code description': 'A recovery code is 12 word phrase representing a private key.',
        'recovery code dialog title': 'Recovery Code',
        'recovery code dialog description':
          'This is your identity recovery code, store it in a safe place. You can use it to recover your identity if you ever lose access to your devices.',
        'recovery code dialog warning 1': 'NOTE: This code will not be displayed again.',
        'recovery code dialog warning 2':
          'It is your private key for recovering DXOS data. Anyone with this key will be able to gain access to your account.',
        'recovery code confirmation label': 'Please confirm you have saved the code.',
        'continue label': 'Continue',
      },
    },
  },
] as const satisfies Resource[];
