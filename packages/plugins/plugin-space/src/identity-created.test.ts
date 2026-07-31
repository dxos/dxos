//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import { AppAnnotation, AppSpace } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { ClientCapabilities, ClientOperation } from '@dxos/plugin-client';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

import { SpacePlugin } from '#plugin';

/**
 * Creating an identity must provision the personal space, wherever it happens: Composer's welcome
 * screen and the CLI's `dx account signup` both go through `ClientOperation.CreateIdentity` and
 * rely on this module for the space, its replication preference, and its root collection.
 */
describe('identity creation', () => {
  test('provisions the personal space', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), SpacePlugin({})],
    });

    const client = harness.get(ClientCapabilities.Client);
    expect(AppSpace.getPersonalSpace(client)).toBeUndefined();

    await harness.invoke(ClientOperation.CreateIdentity, {});

    const space = AppSpace.getPersonalSpace(client);
    if (!space) {
      throw new Error('personal space was not provisioned');
    }
    expect(space.internal.data.edgeReplication).toEqual(EdgeReplicationSetting.ENABLED);
    // The root collection is what every subsequent object add hangs off.
    expect(Option.isSome(Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation))).toBe(true);
  });
});
