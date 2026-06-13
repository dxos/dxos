//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Browser Extension',
        'settings.title': 'Browser extension',
        'test.title': 'Connection',
        'test.button.label': 'Test connection',
        'test.pending.message': 'Contacting extension…',
        'test.connected.message': 'Connected to {{name}} v{{version}}.',
        'toast.error.invalidPayload.message': 'Unrecognized payload.',
        'toast.error.unsupportedVersion.message': 'Unsupported version — update Composer.',
        'toast.error.disabled.message': 'Extension actions are disabled in settings.',
        'toast.error.noSpace.message': 'Open a space first.',
        'toast.page-action.success.title': 'Action complete',
        'toast.page-action.error.title': 'Action failed',
        'toast.error.unknownAction.message': 'Unknown action — update Composer or the extension.',
        'toast.error.operationFailed.message': 'The action failed to run.',
      },
    },
  },
] as const satisfies Resource[];
