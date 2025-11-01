//
// Copyright 2023 DXOS.org
//

import { Blueprint } from '@dxos/blueprints';
import { Sequence } from '@dxos/conductor';
import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Assistant } from './types';

// TODO(burdon): Standardize translation names.
export const translations = [
  {
    'en-US': {
      // TODO(burdon): From assistant.
      [Blueprint.Blueprint.typename]: {
        'typename label': 'Blueprint',
        'typename label_zero': 'Blueprints',
        'typename label_one': 'Blueprint',
        'typename label_other': 'Blueprints',
        'object name placeholder': 'New blueprint',
        'rename object label': 'Rename blueprint',
        'delete object label': 'Delete blueprint',
      },
      // TODO(burdon): From conductor.
      [Sequence.typename]: {
        'typename label': 'Sequence',
        'typename label_zero': 'Sequences',
        'typename label_one': 'Sequence',
        'typename label_other': 'Sequences',
        'object name placeholder': 'New sequence',
        'rename object label': 'Rename sequence',
        'delete object label': 'Delete sequence',
      },
      [Assistant.Chat.typename]: {
        'typename label': 'AI Chat',
        'object name placeholder': 'New AI Chat',
        'rename object label': 'Rename AI Chat',
        'delete object label': 'Delete AI Chat',
      },
      // TODO(burdon): Reconcile with react-ui-chat.
      [meta.id]: {
        'templates label': 'Templates',
        'open ambient chat label': 'Open Assistant',
        'assistant chat label': 'Assistant',
        'plugin name': 'Assistant',
        'settings title': 'Assistant settings',
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
        'type filter placeholder': 'Type',
        'any type filter label': 'Any',
        'no blueprint message': 'No active blueprints',
        'tool call label': 'Calling tool...',
        'tool result label': 'Success',
        'tool error label': 'Tool call failed',

        'sequence logs label': 'Logs',

        'assistant dialog title': 'Assistant',
        'open assistant label': 'Open assistant',

        'no tools': 'No tools are configured',
        'no results': 'No results',

        'button retry': 'Retry',
        'button suggestion': 'Assistant suggestion',
        'button select option': 'Select option',
        'button cancel': 'Cancel',
        'button save': 'Save',
        'button run': 'Run',
        'button new thread': 'New Chat',
        'chat history label': 'Chat History',
        'chat update name label': 'Update AI Chat name',

        'toolkit label': 'Toolkit',
        'summary label': 'Summary',

        'search placeholder': 'Search...',
        'prompt placeholder': 'Enter question or command...',
        'button context objects': 'Add to context',
        'button context settings': 'Chat settings',
        'button microphone': 'Click to speak',
        'button cancel processing': 'Stop processing',
        'blueprints in context title': 'Blueprints',
        'objects in context title': 'Content',
        'remove object in context label': 'Remove document',
        'chat model title': 'Model',

        'settings default label': 'Default',
        'settings custom prompts label': 'Use custom prompts',
        'settings llm provider label': 'LLM provider',
        'settings edge llm model label': 'Remote language model',
        'settings ollama llm model label': 'Ollama language model',
      },
    },
  },
] as const satisfies Resource[];
