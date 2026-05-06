//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

// Use the CLI variant — the main ClientPlugin references capabilities that resolve to undefined under Node.
import { ClientPlugin } from '@dxos/plugin-client';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ChessPlugin } from './index';
import { meta } from './meta';
import { Print } from './operations';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('ChessPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Startup cascades: GraphPlugin fires SetupAppGraph + SetupMetadata; ClientPlugin fires SetupSchema.
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), ChessPlugin()],
    });

    // metadata activates on SetupMetadata (fired by GraphPlugin during Startup).
    expect(harness.manager.getActive()).toContain(moduleId('metadata'));

    // schema activates on SetupSchema — cascades automatically from Startup via ClientPlugin.
    expect(harness.manager.getActive()).toContain(moduleId('schema'));

    // OperationHandler activates on SetupOperationHandler — fired automatically by OperationPlugin
    // during Startup, so it is already active.
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
