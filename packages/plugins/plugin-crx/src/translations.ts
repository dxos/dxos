//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'CRX',
        'settings.title': 'Browser extension',
        'test.title': 'Connection',
        'test.button.label': 'Test connection',
        'test.pending.message': 'Contacting extension…',
        'test.connected.message': 'Connected to {{name}} v{{version}}.',
        'toast.person.title': 'Added person',
        'toast.organization.title': 'Added organization',
        'toast.note.title': 'Added note',
        'toast.error.title': 'Clip failed',
        'toast.error.invalidPayload.message': 'Unrecognized clip payload.',
        'toast.error.unsupportedVersion.message': 'Unsupported clip version — update Composer.',
        'toast.error.unsupportedKind.message': 'Unsupported clip kind.',
        'toast.error.noSpace.message': 'Open a space first.',
        'toast.error.internal.message': 'Failed to save clip.',
      },
    },
  },
] as const satisfies Resource[];
