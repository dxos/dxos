//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';
// Use the CLI variant — the main ClientPlugin references capabilities that resolve to undefined under Node.
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import ChessPlugin from './ChessPlugin';
import { meta } from './meta';
import { Print } from './operations';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('ChessPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), ChessPlugin()],
    });

    // Modules expected to be active after a normal startup.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('metadata'), moduleId('schema'), moduleId('ReactSurface')]),
    );

    // SetupArtifactDefinition is fired by AssistantPlugin, which can't be included here due to a workspace cycle.
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('BlueprintDefinition'));

    // Operation handlers are not loaded on startup — SetupOperationHandler fires lazily when an operation is invoked.
    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });

  test('invokes the Print operation via the invoker capability', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ChessPlugin()] });
    const result = await harness.invoke(Print, {});
    // Empty input returns empty ASCII (handler swallows errors for malformed FEN).
    expect(typeof result.ascii).toBe('string');
  });

  test('Print renders a PGN to ASCII board', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ChessPlugin()] });
    const { ascii } = await harness.invoke(Print, { pgn: '1. e4 e5' });
    expect(ascii).toContain('a  b  c  d  e  f  g  h');
  });
});
