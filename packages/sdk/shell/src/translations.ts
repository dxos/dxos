//
// Copyright 2022 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translations = [
  {
    'en-US': {
      'manage profile label': 'Manage identity',
      'identity offline description': 'Offline',
      'sidebar label': 'DXOS sidebar',
      'copy invitation code label': 'Copy URL',
      'copy success label': 'Copied',
      'copy self did label': 'Copy DID',
      'open share panel label': 'View QR code',
      'manage credentials label': 'Manage credentials',
      'joining space heading': 'Joining space',
      'join space heading': 'Enter space invitation',
      'halo heading': 'Initialize device identity',
      'exit label': 'Exit',
      'identity selector title': 'Join as',
      'identity radio group title': 'Select an identity that is already associated with this device',
      'add identity label': 'Add',
      'continue label': 'Continue',
      'pending label': 'Pending',
      'back label': 'Back',
      'next label': 'Next',
      'close label': 'Close',
      'auth choices label': 'Choose an identity',
      'create identity label': 'Create an identity',
      'create identity description': 'Create a new identity.',
      'recover identity label': 'Use a recovery code',
      'recover identity description': 'Enter your recovery code to log in manually.',
      'invitation input placeholder': 'Invitation code',
      'recovery code placeholder': 'Recovery code',
      'display name placeholder': 'Display name',
      'join identity label': 'Use another device',
      'join identity description': 'Add this device to an identity you’re already logged into on another device.',
      'deselect identity label': 'Back to identities',
      'addition method chooser title': 'An identity is required to continue',
      'new identity input label': 'Set display name',
      'recover identity input label': 'Type or paste your recovery code',
      'failed to create identity message': 'Failed to create an identity.',
      'failed to recover identity message': 'Failed to recover an identity from the provided recovery code.',
      'failed to authenticate message': 'Incorrect code.',
      'identity added label': 'Created identity & added to this device:',
      'join space as identity heading': '<part>as </part><part><icon/><label>{{labelValue}}</label></part>',
      'error status label': 'Failed',
      'timeout status label': 'Timed out',
      'cancelled status label': 'Cancelled',
      'init status label': 'Ready to connect',
      'connecting status label': 'Connecting…',
      'connected status label': 'Enter authentication code',
      'authenticating status label': 'Enter authentication code',
      'success status label': 'Success',
      'cancel label': 'Cancel',
      'done label': 'Done',
      'reset label': 'Start over',
      'auth code input label': 'Enter the verification code',
      'invitation input label': 'Paste an invitation code or URL',
      'create device invitation label': 'Add device',
      'create space invitation label': 'Invite',
      'qr label': 'Scan to accept invitation',
      'empty invitations message': 'No pending invitations',
      'empty device list message': 'No devices authenticated other than this device.',
      'show all spaces label': 'All spaces',
      'all spaces label': 'All spaces',
      'create space label': 'Create a new space',
      'join space label': 'Join a space',
      'show current space label': 'Current space',
      'view space invitations label': 'View space invitations',
      'toggle sidebar label': 'Open/close sidebar',
      'open sidebar label': 'Open sidebar',
      'close sidebar label': 'Close sidebar',
      'welcome message': 'Welcome',
      'selecting identity heading': 'Selecting identity',
      'devices heading': 'Devices',
      'identity heading': 'Profile settings',
      'choose add device label': 'Add device',
      'choose devices label': 'Manage devices',
      'choose profile label': 'Edit profile',
      'choose sign out label': 'Reset storage',
      'choose join new identity label': 'Join existing device',
      'empty space members message': 'There is nobody in this space yet.',
      'back to all invitations label': 'Back to all invitations',
      'invitation heading': 'Invitation',
      'invitation list heading': 'Invitations',
      'device invitation list heading': 'Pending device invitations',
      'space invitation list heading': 'Pending invitations',
      'device list heading': 'Devices',
      'space member list heading': 'Members',
      'space panel heading': 'Space membership',
      'auth code message': 'Enter the following auth code on the joining device. Click the code to copy it.',
      'auth other device emoji message': 'Be sure the other device shows the following emoji.',
      'display name input label': 'Display name',
      'display name input placeholder': 'Enter a display name',
      'invite one label': 'Create single-use invitation',
      'invite one description': 'Only one user may join.',
      'invite one qr label': 'Single-use invitation',
      'invite one list item label': 'Active single-use invitation',
      'invite many label': 'Create multi-use invitation',
      'invite many description': 'Anyone with the link can join.',
      'invite many qr label': 'Multi-use invitation',
      'invite many list item label': 'Active multi-use invitation',
      'invite options label': 'Change the active invite option.',
      'reset in progress label': 'Resetting...',
      'confirm label': 'Confirm',
      'reset storage input label':
        'WARNING: This will delete all data on this device. Type {{confirmationValue}} to continue.',
      'join new identity input label':
        'WARNING: To join an existing device all data on this device will be deleted. Type {{confirmationValue}} to continue.',
      'failed to reset identity message': 'Failed to reset identity.',
      'confirmation value': 'RESET',
      'confirmation placeholder': 'Enter {{confirmationValue}} to continue.',
      'sign out chooser title': 'Danger zone',
      'sign out chooser message': 'Proceeding with the action below will erase all data on this device.',
      'join new identity label': 'Join an existing identity',
      'reset device label': 'Reset storage',
      'reset device confirm message': 'Are you sure you want to reset your device? All data will be lost.',
      'emoji and color label': 'Emoji and color',
      'clear label': 'Use default',
      'select emoji label': 'Avatar emoji',
      'select hue label': 'Avatar background color',
      'resetting message': 'One moment while the device is reset…',
      'expires label': 'Expires {{timeLeft}}',
      'no expiration label': 'Doesn’t expire',

      // TODO(burdon): Factor out.
      'red label': 'Red',
      'orange label': 'Orange',
      'amber label': 'Amber',
      'yellow label': 'Yellow',
      'lime label': 'Lime',
      'green label': 'Green',
      'emerald label': 'Emerald',
      'teal label': 'Teal',
      'cyan label': 'Cyan',
      'sky label': 'Sky',
      'blue label': 'Blue',
      'indigo label': 'Indigo',
      'violet label': 'Violet',
      'purple label': 'Purple',
      'fuchsia label': 'Fuchsia',
      'pink label': 'Pink',
      'rose label': 'Rose',

      'select a hue label': 'Select color',
      'hue label': 'Hue',
      'icon label': 'Icon',
      'current device tag label': 'This device',
      'device name placeholder': '{{platform}} on {{os}}',
      'more options label': 'More options',
      'disconnect label': 'Go offline',
      'connect label': 'Go online',
      'edit device label': 'Edit device name & avatar',
      'agent heading': 'Agent',
      'create agent clickwrap':
        'By creating an agent, you agree to our <tosLink href="https://dxos.org/tos">Terms of Service</tosLink>.',
      'create agent description':
        'Creating an agent helps keep your devices and peers in-sync. An agent is like any other device, but since it’s always online your changes will sync even when all your physical devices are asleep.',
      'create agent label': 'Start an agent',
      'destroy agent label': 'Shut down agent',
      'agent device label': 'Your agent',
      'shell fallback title': 'Shell failed to connect',
      'creating agent label': 'Starting agent…',
      'destroying agent label': 'Stopping agent…',
      'getting agent label': 'Checking agent status…',
      'agent requested label': 'Agent requested',
      'agent requested description':
        'The agent service is creating an agent for you. Once the agent connects, it will display in the devices list.',
      'authenticating label': 'Authenticating…',
      'create recovery code label': 'Create recovery code',
      'choose recover identity label': 'Recover identity',
    },
  },
] as const satisfies Resource[];
