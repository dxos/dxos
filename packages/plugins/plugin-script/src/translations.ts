//
// Copyright 2023 DXOS.org
//

import { ScriptType } from '@dxos/functions';
import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Notebook } from './types';

export const translations = [
  {
    'en-US': {
      [ScriptType.typename]: {
        'typename label': 'Script',
        'typename label_zero': 'Scripts',
        'typename label_one': 'Script',
        'typename label_other': 'Scripts',
        'object name placeholder': 'New script',
        'rename object label': 'Rename script',
        'delete object label': 'Delete script',
      },
      [Notebook.Notebook.typename]: {
        'typename label': 'Notebook',
        'typename label_zero': 'Notebooks',
        'typename label_one': 'Notebook',
        'typename label_other': 'Notebooks',
        'object name placeholder': 'New notebook',
        'rename object label': 'Rename notebook',
        'delete object label': 'Delete notebook',
      },
      [meta.id]: {
        'plugin name': 'Scripts',
        'settings title': 'Scripts plugin settings',
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
        'no github token label': 'This space has no GitHub access token available.',
        'open token manager label': 'Open Token Manager',
        'publish label': 'Publish',
        'publishing label': 'Publishing',
        'blueprint editor label': 'Blueprint',
        'blueprint editor description': 'Create a blueprint that exposes this script as a tool.',
        'blueprint instructions label': 'Instructions',
        'blueprint instructions placeholder': 'Describe how this tool should be used.',
        'create blueprint label': 'Create blueprint',
        'creating label': 'Creating…',
        'editor input mode label': 'Editor input mode',
        'select editor input mode placeholder': 'Select editor input mode…',
        'settings editor input mode default label': 'Default',
        'settings editor input mode vim label': 'Vim',
        'settings editor input mode vscode label': 'VS Code',
        'template select group label': 'Select template',
        'function panel label': 'Debug Function',
        'script test label': 'Test',
        'script logs label': 'Logs',

        'deployment dialog title': 'Default Scripts',
        'deployment dialog scripts found message': 'Script templates:',
        'deployment dialog deploy functions button label_one': 'Create and deploy script',
        'deployment dialog deploy functions button label_other': 'Create and deploy scripts',
        'deployment dialog deploy functions pending button label_one': 'Deploying script',
        'deployment dialog deploy functions pending button label_other': 'Deploying scripts',
        'deployment dialog skip button label': 'Skip',

        'script deployment toast label_one': 'Script deployed',
        'script deployment toast label_other': 'Scripts deployed',
        'script deployment toast description_one': 'Your script has been deployed successfully.',
        'script deployment toast description_other': 'Your scripts have been deployed successfully.',
        'script deployment toast close label_one': 'Close',
        'script deployment toast close label_other': 'Close',
        'script deployment error toast label_one': 'Script deployment failed',
        'script deployment error toast label_other': 'Scripts deployment failed',
        'script deployment error toast description_one': 'There was an error deploying your script.',
        'script deployment error toast description_other': 'There was an error deploying your scripts.',
        'script deployment error toast close label_one': 'Close',
        'script deployment error toast close label_other': 'Close',
      },
    },
  },
] as const satisfies Resource[];
