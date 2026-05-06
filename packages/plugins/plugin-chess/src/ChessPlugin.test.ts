//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AppActivationEvents } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ChessPlugin } from './index';
import { meta } from './meta';
import { Print } from './operations';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('ChessPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ChessPlugin()],
    });

    // metadata activates on SetupMetadata (fired by GraphPlugin during Startup).
    expect(harness.manager.getActive()).toContain(moduleId('metadata'));

    // schema activates on SetupSchema — fired explicitly here (normally fired by ClientPlugin).
    await harness.fire(AppActivationEvents.SetupSchema);
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
