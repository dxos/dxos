//
// Copyright 2023 DXOS.org
//

import { AUTOMATION_PLUGIN } from './meta';
import { AIChatType } from './types';

export default [
  {
    'en-US': {
      [AIChatType.typename]: {
        'typename label': 'AI Chat',
      },
      [AUTOMATION_PLUGIN]: {
        'plugin name': 'Automation',
        'object placeholder': 'New prompt',
        'create object label': 'Create prompt',
        'create trigger label': 'Create trigger',
        'create stack section label': 'Create prompt',
        'command placeholder': 'Enter slash command...',
        'template placeholder': 'Enter template...',
        'value placeholder': 'Enter value...',
        'select preset template placeholder': 'Select preset',
        'open automation panel label': 'Show Automations',
        'automation panel label': 'Automations',
        'service registry label': 'Service Registry',

        'chat input placeholder': 'Ask a question...',
        'chat stop': 'Cancel request.',

        'function select label': 'Function',
        'function select placeholder': 'Select function',
        'function enabled': 'Enabled',

        'trigger select label': 'Trigger',
        'trigger select placeholder': 'Trigger type',

        'trigger type timer': 'Timer',
        'trigger type webhook': 'Webhook',
        'trigger type websocket': 'Websocket',
        'trigger type subscription': 'Subscription',
        'trigger type email': 'Email',
        'trigger type queue': 'Queue',

        'trigger filter': 'Filter',
        'trigger cron': 'Cron',
        'trigger method': 'Method',
        'trigger endpoint': 'Endpoint',

        'trigger copy url': 'Copy URL',
        'trigger copy email': 'Copy Email',

        'trigger meta add': 'Add',
        'trigger meta remove': 'Remove',
        'trigger meta prop name placeholder': 'New meta property name',

        'prompt placeholder': 'Ask a question...',
        'microphone button': 'Click to speak',
        'cancel processing button': 'Stop processing',
      },
    },
  },
];
