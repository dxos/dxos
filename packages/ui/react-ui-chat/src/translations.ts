//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

const translationKey = 'react-ui-chat';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'templates label': 'Templates',
        'open ambient chat label': 'Open Assistant',
        'assistant chat label': 'Assistant',
        'plugin name': 'Assistant',
        'object placeholder': 'New prompt',
        'create object label': 'Create prompt',
        'create trigger label': 'Create trigger',
        'create stack section label': 'Create prompt',
        'command placeholder': 'Enter slash command...',
        'template placeholder': 'Enter template...',
        'value placeholder': 'Enter value...',
        'prompt rules label': 'Prompt Rules',
        'typename placeholder': 'Enter typename of objects which this template is for',
        'description placeholder': 'Enter description of when this template should be used',
        'select preset template placeholder': 'Select preset',
        'service registry label': 'Service Registry',

        'sequence logs label': 'Logs',

        'assistant dialog title': 'Assistant',
        'open assistant label': 'Open assistant',

        'search input placeholder': 'Search...',
        'chat input placeholder': 'Ask a question...',
        'chat stop': 'Cancel request.',

        'button save': 'Save',
        'button run': 'Run',

        'prompt placeholder': 'Ask a question...',
        'microphone button': 'Click to speak',
        'cancel processing button': 'Stop processing',

        'settings default label': 'Default',
        'settings custom prompts label': 'Use custom prompts',
        'settings llm provider label': 'LLM provider',
        'settings edge llm model label': 'Remote language model',
        'settings ollama llm model label': 'Ollama language model',
      },
    },
  },
] as const satisfies Resource[];
