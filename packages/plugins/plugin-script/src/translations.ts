//
// Copyright 2023 DXOS.org
//

import { ScriptType } from '@dxos/functions/types';

import { SCRIPT_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [ScriptType.typename]: {
        'typename label': 'Script',
        'object name placeholder': 'New script',
      },
      [SCRIPT_PLUGIN]: {
        'plugin name': 'Scripts',
        'description label': 'Description',
        'description placeholder': 'Enter description',
        'binding placeholder': 'Function name',
        'function request placeholder': 'Function request',
        'deploy label': 'Deploy',
        'deployed label': 'Current version of the script is deployed',
        'upload failed label': 'Upload failed',
        'copy link label': 'Copy function link',
        'format label': 'Format',
        'toggle details label': 'Toggle details panel',
        'authenticate action label': 'Authenticate functions service',
        'authenticate button label': 'Authenticate',
        'name label': 'Name',
        'remote function settings heading': 'Remote Function',
        'function url label': 'Invocation URL',
        'function binding label': 'Function binding',
        'function binding placeholder': 'Enter binding name (e.g., NAME)',
        'script publish settings label': 'Publishing',
        'script publish settings description': 'Scripts can be shared publicly as Github gists.',
        'no github token label': 'This space has no Github access token available.',
        'open token manager label': 'Open Token Manager',
        'publish label': 'Publish',
        'publishing label': 'Publishing',
        'editor input mode label': 'Editor input mode',
        'select editor input mode placeholder': 'Select editor input mode…',
        'settings editor input mode default label': 'Default',
        'settings editor input mode vim label': 'Vim',
        'settings editor input mode vscode label': 'VS Code',
        'template select group label': 'Select template',
        'function panel label': 'Debug Function',
        'script settings label': 'Settings',
        'script execute label': 'Test',
        'script automation label': 'Automation',
        'script logs label': 'Logs',
      },
    },
  },
];
