//
// Copyright 2023 DXOS.org
//

import { ASSISTANT_PLUGIN } from './meta';
import { AIChatType, TemplateType } from './types';

export default [
  {
    'en-US': {
      [AIChatType.typename]: {
        'typename label': 'AI Chat',
      },
      [TemplateType.typename]: {
        'typename label': 'Template',
      },
      // TODO(wittjosiah): Audit translations, most appear unused.
      [ASSISTANT_PLUGIN]: {
        'chat title placeholder': 'AI Chat',
        'template title placeholder': 'Template',

        'open ambient chat label': 'Open AI chat',
        'plugin name': 'Assistant',
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

        'assistant dialog title': 'Assistant',
        'open assistant label': 'Open assistant',

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

        'settings custom prompts label': 'Custom prompts',
        'settings llm model label': 'LLM model',
        'settings default llm model label': 'Default Model',
      },
    },
  },
];
