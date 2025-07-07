//
// Copyright 2023 DXOS.org
//

import { type Resource } from 'i18next';

import { Blueprint } from '@dxos/assistant';
import { Type } from '@dxos/echo';

import { ASSISTANT_PLUGIN } from './meta';
import { AIChatType, TemplateType } from './types';

export const translations: Resource[] = [
  {
    'en-US': {
      [Type.getTypename(AIChatType)]: {
        'typename label': 'Assistant',
        'typename label_zero': 'Assistants',
        'typename label_one': 'Assistant',
        'typename label_other': 'Assistants',
        'object name placeholder': 'New assistant',
      },
      [Type.getTypename(Blueprint)]: {
        'typename label': 'Blueprint',
        'typename label_zero': 'Blueprints',
        'typename label_one': 'Blueprint',
        'typename label_other': 'Blueprints',
        'object name placeholder': 'New blueprint',
      },
      [Type.getTypename(TemplateType)]: {
        'typename label': 'Template',
        'typename label_zero': 'Templates',
        'typename label_one': 'Template',
        'typename label_other': 'Templates',
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

        'blueprint logs label': 'Logs',

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

export default translations;
