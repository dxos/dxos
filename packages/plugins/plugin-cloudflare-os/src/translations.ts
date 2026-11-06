//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { CloudflareOs } from '#types';

import { CloudflareOsNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(CloudflareOs.Workspace)]: {
        'typename.label': 'Cloudflare OS workspace',
        'typename.label_zero': 'Cloudflare OS workspaces',
        'typename.label_one': 'Cloudflare OS workspace',
        'typename.label_other': 'Cloudflare OS workspaces',
        'object-name.placeholder': 'Cloudflare OS workspace',
        'rename-object.label': 'Rename workspace',
        'delete-object.label': 'Remove workspace',
      },
      [CloudflareOsNamespace.key]: {
        'plugin.name': 'Cloudflare OS',
        'refresh.label': 'Refresh',
        'pending-gadget.label': '{{title}} (proposed)',
        'no-gadgets.message': 'This workspace has no gadgets yet. Ask the Cloudflare OS agent in a chat to build one.',
        'no-gadget-ui.message': 'This gadget has no user interface yet.',
      },
    },
  },
] as const satisfies Theme.Resource[];
