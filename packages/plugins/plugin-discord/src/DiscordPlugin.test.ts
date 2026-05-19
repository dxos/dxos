//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN, Key, Ref } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { type Integration, IntegrationPlugin } from '@dxos/plugin-integration/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DiscordPlugin } from '#plugin';
import { DiscordOperation } from '#types';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('DiscordPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), IntegrationPlugin(), DiscordPlugin()],
    });

    // After autoStart: SetupAppGraph fires (cascading SetupIntegrationProviders via
    // IntegrationPlugin's AppGraphBuilder), and SetupProcessManager fires from
    // OperationPlugin — both reach the DiscordPlugin's modules.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('DiscordIntegrationProvider'), moduleId('OperationHandler')]),
    );
  }, 30_000);

  // Defends against a regression where the operation handlers don't make it
  // into the merged `OperationHandlerSet` (e.g. wrong default export,
  // mismatched op key, or stale dev-server bundle). We pass a dangling ref so
  // the handler is reached but bails out — anything other than
  // `NoHandlerError` confirms the lookup succeeded.
  test('GetDiscordChannels handler is reachable through the merged OperationHandlerSet', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), IntegrationPlugin(), DiscordPlugin()],
    });

    const danglingRef = Ref.fromDXN<Integration.Integration>(DXN.parse(`dxn:echo:@:${Key.ObjectId.random()}`));
    let caught: unknown;
    try {
      await harness.invoke(DiscordOperation.GetDiscordChannels, { integration: danglingRef });
    } catch (error) {
      caught = error;
    }
    expect(String(caught)).not.toMatch(/No handler found for operation/);
  }, 30_000);
});
