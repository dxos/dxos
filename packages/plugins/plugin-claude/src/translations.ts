//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { ClaudeAgentSession, ClaudeManagedAgent } from '#types';

import { ClaudeNamespace } from './namespace.ts';

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
      [ClaudeNamespace.key]: {
        'plugin.name': 'Claude',
        'software-config.label': 'Software',
      },
    },
  },
] as const satisfies Theme.Resource[];
