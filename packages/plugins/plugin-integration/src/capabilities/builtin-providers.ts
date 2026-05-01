//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { OAuthProvider } from '@dxos/protocols';

import { IntegrationProvider } from './integration-provider';

/**
 * Built-in `IntegrationProvider` entries for OAuth presets that don't yet
 * have a dedicated service plugin (GitHub, Linear, Slack). They register
 * `id`, `source`, `label`, and `oauth` so the provider shows up in the
 * "Add Object → Integration" picker; sync operations and `onTokenCreated`
 * are absent — sync is unavailable and no service-specific account fill
 * happens.
 *
 * As real service plugins land (plugin-github, plugin-linear,
 * plugin-slack), each contributes its own `IntegrationProvider` and the
 * matching entry here should be removed.
 */
export default Capability.makeModule<IntegrationProvider[]>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProvider, [
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
          scopes: ['write'],
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
    ]);
  }),
);
