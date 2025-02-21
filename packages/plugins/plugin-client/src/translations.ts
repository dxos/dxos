//
// Copyright 2023 DXOS.org
//

import { CLIENT_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [CLIENT_PLUGIN]: {
        'open shell label': 'Open HALO',
        'manage credentials dialog title': 'Manage Account Recovery',
        'recovery setup dialog title': 'Account Recovery',
        'recovery setup dialog description':
          'In order to recover your account you need to register a recovery credential. Passkeys are the recommended way to do this, they can be stored in your browser or in a password manager.',
        'create passkey label': 'Create Passkey',
        'create passkey description':
          'A passkey is a secure and easy to use credential that can be used to recover your account.',
        'create recovery code label': 'Create Recovery Code',
        'create recovery code description': 'A recovery code is 12 word phrase representing a private key.',
        'recovery code dialog title': 'Recovery Code',
        'recovery code dialog description':
          'This is your identity recovery code, store it in a safe place. You can use it to recover your identity if you ever lose access to your devices.',
        'recovery code dialog warning 1': 'NOTE: This code will not be displayed again.',
        'recovery code dialog warning 2':
          'It is your private key for recovering DXOS data. Anyone with this key will be able to gain access to your account.',
        'recovery code confirmation label': 'Please confirm you have saved the code.',
        'continue label': 'Continue',
      },
    },
  },
];
