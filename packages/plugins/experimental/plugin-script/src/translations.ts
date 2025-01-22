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
        'editor input mode label': 'Editor input mode',
        'select editor input mode placeholder': 'Select editor input mode…',
        'settings editor input mode default label': 'Default',
        'settings editor input mode vim label': 'Vim',
        'settings editor input mode vscode label': 'VS Code',
      },
    },
  },
];
