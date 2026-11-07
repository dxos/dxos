//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { AutocueBundle } from '#types';

import { AutocueNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(AutocueBundle.AutocueBundle)]: {
        'typename.label': 'Demo',
        'typename.label_zero': 'Demos',
        'typename.label_one': 'Demo',
        'typename.label_other': 'Demos',
        'object-name.placeholder': 'New demo',
        'add-object.label': 'Add demo',
        'rename-object.label': 'Rename demo',
        'delete-object.label': 'Delete demo',
        'object-deleted.label': 'Demo deleted',
      },
      [AutocueNamespace.key]: {
        'plugin.name': 'Autocue',
        'no-url.message': 'Set the URL of an autocue bundle (e.g. https://dx.pub/demo/<slug>/) to play it.',
        'loading.message': 'Loading the bundle…',
        'load-error.message': 'Could not load the bundle: {{error}}',
      },
    },
  },
] as const satisfies Theme.Resource[];
