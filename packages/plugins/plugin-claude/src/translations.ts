//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { ClaudeAgentSession, ClaudeManagedAgent } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(ClaudeManagedAgent.ClaudeManagedAgent)]: {
        'typename.label': 'Claude Agent',
        'typename.label_zero': 'Claude Agents',
        'typename.label_one': 'Claude Agent',
        'typename.label_other': 'Claude Agents',
        'object-name.placeholder': 'New Claude agent',
        'add-object.label': 'Add Claude agent',
        'rename-object.label': 'Rename Claude agent',
        'delete-object.label': 'Delete Claude agent',
      },
      [Type.getTypename(ClaudeAgentSession.ClaudeAgentSession)]: {
        'typename.label': 'Agent Session',
        'typename.label_zero': 'Agent Sessions',
        'typename.label_one': 'Agent Session',
        'typename.label_other': 'Agent Sessions',
        'object-name.placeholder': 'New agent session',
        'rename-object.label': 'Rename session',
        'delete-object.label': 'Delete session',
      },
      [meta.profile.key]: {
        'plugin.name': 'Claude',
      },
    },
  },
] as const satisfies Resource[];
