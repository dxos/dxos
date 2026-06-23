//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { GamePlugin } from '@dxos/plugin-game/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ChessPlugin } from '#plugin';

import { meta } from './meta';
import { ChessOperation } from './types';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('ChessPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), GamePlugin(), ChessPlugin()],
    });

    // Modules expected to be active after a normal startup (headless/node variant).
    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('schema')]));

    // SetupArtifactDefinition is fired by AssistantPlugin, which can't be included here due to a workspace cycle.
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('SkillDefinition'));

    // Operation handlers are not loaded on startup — SetupProcessManager fires lazily when an operation is invoked.
    await harness.fire(ActivationEvents.SetupProcessManager);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });

  test('invokes the Print operation via the invoker capability', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [GamePlugin(), ChessPlugin()] });
    const result = await harness.invoke(ChessOperation.Print, {});
    // Empty input returns empty ASCII (handler swallows errors for malformed FEN).
    expect(typeof result.ascii).toBe('string');
  });

  test('Print renders a PGN to ASCII board', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [GamePlugin(), ChessPlugin()] });
    const { ascii } = await harness.invoke(ChessOperation.Print, { pgn: '1. e4 e5' });
    expect(ascii).toContain('a  b  c  d  e  f  g  h');
  });
});
