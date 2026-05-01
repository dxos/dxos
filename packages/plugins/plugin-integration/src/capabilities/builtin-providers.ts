//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { IntegrationProvider, type IntegrationProviderEntry } from '#types';

import { CUSTOM_PROVIDER_ID } from '../constants';

/**
 * Built-in `IntegrationProvider` entries: custom token + stub OAuth presets
 * awaiting dedicated service plugins.
 */
export default Capability.makeModule<IntegrationProviderEntry[]>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProvider, [
      {
        id: CUSTOM_PROVIDER_ID,
        // The user enters the source in the dialog; we don't know it ahead of time.
        source: '',
        label: 'Custom Token',
      },
      // TODO(wittjosiah): Implement github, linear, slack as dedicated plugins instead of presets.
      /*
      {
        id: 'github',
        source: 'github.com',
        label: 'GitHub',
        oauth: {
          provider: OAuthProvider.GITHUB,
          scopes: ['repo', 'read:user'],
        },
      },
      {
        id: 'linear',
        source: 'linear.app',
        label: 'Linear',
        oauth: {
          provider: OAuthProvider.LINEAR,
          scopes: ['read', 'write'],
        },
      },
      {
        id: 'slack',
        source: 'slack.com',
        label: 'Slack',
        oauth: {
          provider: OAuthProvider.SLACK,
          scopes: ['channels:read', 'chat:write', 'users:read'],
        },
      },
      */
    ]);
  }),
);
