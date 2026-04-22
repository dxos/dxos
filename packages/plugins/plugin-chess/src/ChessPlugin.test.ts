//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ChessPlugin } from './ChessPlugin';
import { Print } from './operations';

describe('ChessPlugin', () => {
  test('activates and contributes expected capabilities', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [ChessPlugin()] });
    const surfaces = harness.getAll(Capabilities.ReactSurface).flat();
    expect(surfaces.length).toBeGreaterThan(0);
  });

  test('fires activation events explicitly with autoStart: false', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [ChessPlugin()], autoStart: false });

    // No modules have activated yet; schema/surface capabilities are absent.
    expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);
    expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

    // Fire SetupSchema — the schema module activates and contributes the Chess.Game type.
    await harness.fire(AppActivationEvents.SetupSchema);
    const schemas = harness.getAll(AppCapabilities.Schema).flat();
    expect(schemas.length).toBeGreaterThan(0);

    // ReactSurface is gated on a different event; still absent.
    expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

    // Fire SetupReactSurface; the surface module contributes.
    await harness.fire(ActivationEvents.SetupReactSurface);
    expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
  });

  test('waitForEvent resolves once the event has been fired', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [ChessPlugin()], autoStart: false });

    // Fire and wait concurrently — waitForEvent resolves regardless of ordering.
    await Promise.all([
      harness.fire(AppActivationEvents.SetupTranslations),
      harness.waitForEvent(AppActivationEvents.SetupTranslations),
    ]);
    expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
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
