//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN, Key, Ref } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { IntegrationPlugin } from '@dxos/plugin-integration/plugin';
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
  //
  // Note: this test sets up the harness with DiscordPlugin in the initial
  // plugins list, so the OperationHandler module activates *before*
  // ProcessManager snapshots the merged set. It does NOT exercise the
  // production scenario where a user enables Discord from the registry mid-
  // session: in that case the contribution lands in the OperationHandler
  // capability registry but ProcessManager's frozen merged set never sees
  // it, and `Operation.invoke` returns `NoHandlerError` until the page is
  // reloaded.
  // TODO(wittjosiah): make `ProcessManagerCapability` subscribe to
  // `Capability.atom(Capabilities.OperationHandler)` and rebuild the merged
  // set on change so post-startup plugin enablement Just Works.
  test('GetDiscordChannels handler is reachable through the merged OperationHandlerSet', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), IntegrationPlugin(), DiscordPlugin()],
    });

    const danglingRef = Ref.fromDXN(DXN.parse(`dxn:echo:@:${Key.ObjectId.random()}`));
    let caught: unknown;
    try {
      await harness.invoke(DiscordOperation.GetDiscordChannels, { integration: danglingRef });
    } catch (error) {
      caught = error;
    }
    expect(String(caught)).not.toMatch(/No handler found for operation/);
  }, 30_000);
});
