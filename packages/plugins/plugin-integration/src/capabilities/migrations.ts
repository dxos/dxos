//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Migration } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';

import { Integration } from '#types';

/**
 * v0.1.0 → v0.2.0: replaces the single `accessToken: Ref<AccessToken>` with an
 * `accessTokens: Ref<AccessToken>[]` array to support multi-credential integrations
 * (e.g. IMAP + SMTP). Existing rows are wrapped in a one-element array.
 */
export const migrations = [
  Migration.define({
    from: Integration.IntegrationV1,
    to: Integration.Integration,
    transform: async (from) => ({
      ...(from.name !== undefined ? { name: from.name } : {}),
      ...(from.providerId !== undefined ? { providerId: from.providerId } : {}),
      accessTokens: [from.accessToken],
      targets: from.targets,
      ...(from.snapshots !== undefined ? { snapshots: from.snapshots } : {}),
    }),
    onMigration: async () => {},
  }),
];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ClientCapabilities.Migration, migrations);
  }),
);
