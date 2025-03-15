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
        'service registry label': 'Service Registry',

        'assistant dialog title': 'Assistant',
        'open assistant label': 'Open assistant',

        'chat input placeholder': 'Ask a question...',
        'chat stop': 'Cancel request.',

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
