//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ChessPlugin } from './ChessPlugin';
import { Print } from './operations';

describe('ChessPlugin', () => {
  test('activates and contributes expected capabilities', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [ChessPlugin()] });
    const surfaces = harness.getAll(Capabilities.ReactSurface).flat();
    expect(surfaces.length).toBeGreaterThan(0);
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
