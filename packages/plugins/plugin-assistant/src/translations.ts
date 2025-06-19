//
// Copyright 2023 DXOS.org
//

import { BlueprintType } from '@dxos/assistant';
import { getSchemaTypename } from '@dxos/echo-schema';

import { ASSISTANT_PLUGIN } from './meta';
import { AIChatType, TemplateType } from './types';

export default [
  {
    'en-US': {
      [getSchemaTypename(AIChatType)!]: {
        'typename label': 'Assistant',
        'object name placeholder': 'AI Chat',
      },
      [getSchemaTypename(BlueprintType)!]: {
        'typename label': 'Blueprint',
        'object name placeholder': 'New blueprint',
      },
      [TemplateType.typename]: {
        'typename label': 'Template',
        'object name placeholder': 'New template',
      },
      [ASSISTANT_PLUGIN]: {
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

        'assistant dialog title': 'Assistant',
        'open assistant label': 'Open assistant',

        'search input placeholder': 'Search...',
        'chat input placeholder': 'Ask a question...',
        'chat stop': 'Cancel request.',

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
];
