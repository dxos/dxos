//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { OAuthProvider } from '@dxos/protocols';

import { IntegrationProvider } from './integration-provider';

/**
 * Built-in `IntegrationProvider` entries:
 *
 *  - **OAuth presets** (GitHub, Linear, Slack) that don't yet have a dedicated
 *    service plugin. They register `id`, `source`, `label`, and `oauth` so the
 *    provider shows up in the "Add Object → Integration" picker; sync ops and
 *    `onTokenCreated` are absent. As real service plugins land
 *    (plugin-github, plugin-linear, plugin-slack), each contributes its own
 *    `IntegrationProvider` and the matching entry here should be removed.
 *
 *  - **Custom** — manual access-token entry. No OAuth flow; the user types
 *    `source`, `account`, `token` into a dedicated dialog. The integration
 *    coordinator routes provider entries with no `oauth` through the custom
 *    dialog instead of the OAuth popup. No sync support — purely a credential
 *    holder for ad-hoc services.
 */
export const CUSTOM_PROVIDER_ID = 'custom';

export default Capability.makeModule<IntegrationProvider[]>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProvider, [
      {
        id: CUSTOM_PROVIDER_ID,
        // The user enters the source in the dialog; we don't know it ahead of time.
        source: '',
        label: 'Custom Token',
      },
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
