//
// Copyright 2023 DXOS.org
//

import { ScriptType } from '@dxos/functions';

import { SCRIPT_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [ScriptType.typename]: {
        'typename label': 'Script',
      },
      [SCRIPT_PLUGIN]: {
        'plugin name': 'Scripts',
        'object title placeholder': 'New script',
        'create object label': 'Create script',
        'create stack section label': 'Create script',
        'description label': 'Description',
        'description placeholder': 'Describe what the script does.',
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
        'function binding placeholder': 'BINDING',
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
        'view group label': 'View',
        'view editor label': 'Editor',
        'view split label': 'Split',
        'view debug label': 'Debug',
        // TODO(wittjosiah): Replace debug with logs.
        // 'view logs label': 'Logs',
        'template select group label': 'Select template',
        'function panel label': 'Debug Function',
      },
    },
  },
];
