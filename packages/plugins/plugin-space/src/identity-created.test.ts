//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppMigrations from '@dxos/app-toolkit/AppMigrations';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { Annotation } from '@dxos/echo';
import { Migrations, MigrationVersionAnnotation } from '@dxos/migrations';
import { ClientOperation } from '@dxos/plugin-client';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

import { SpacePlugin } from '#plugin';

/**
 * Creating an identity must provision the spaces every profile starts with, wherever it happens:
 * Composer's welcome screen and the CLI's `dx account signup` both go through
 * `ClientOperation.CreateIdentity` and rely on this module for them.
 */
describe('identity creation', () => {
  // Registered by every host at boot (`composer-app/main.tsx`, `cli/bin.ts`); without it the new
  // space carries no version and every host that does register them reports it as unmigrated.
  AppMigrations.define();

  test('provisions the default and settings spaces', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), SpacePlugin({})],
    });

    const client = harness.get(ClientCapabilities.Client);
    // The harness forks client initialization off startup; `spaces` is unreadable until it lands.
    await client.waitUntilInitialized();
    expect(AppSpace.getDefaultSpace(client)).toBeUndefined();

    await harness.invoke(ClientOperation.CreateIdentity, {});

    const settingsSpace = AppSpace.getSettingsSpace(client);
    const defaultSpace = AppSpace.getDefaultSpace(client);
    if (!settingsSpace || !defaultSpace) {
      throw new Error('identity spaces were not provisioned');
    }
    // The designation lives on the settings space; without it nothing resolves the default space.
    expect(AppSpace.getDefaultSpaceId(settingsSpace)).toEqual(defaultSpace.id);
    // Both replicate through EDGE so they follow the identity across devices.
    expect(defaultSpace.internal.data.edgeReplication).toEqual(EdgeReplicationSetting.ENABLED);
    expect(settingsSpace.internal.data.edgeReplication).toEqual(EdgeReplicationSetting.ENABLED);
    // The root collection is what every subsequent object add hangs off.
    expect(Option.isSome(Annotation.get(defaultSpace.properties, AppAnnotation.RootCollectionAnnotation))).toBe(true);
    // Already at the latest schema, so no host prompts to migrate a space it just created.
    expect(Annotation.get(defaultSpace.properties, MigrationVersionAnnotation)).toEqual(
      Option.some(Migrations.targetVersion),
    );
  });
});
