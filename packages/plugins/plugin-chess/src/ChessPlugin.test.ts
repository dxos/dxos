//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

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

    // Modules expected to be active after a normal startup (headless/node variant). SkillDefinition
    // and OperationHandler are dependency-mode roots, so they activate immediately too.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('SkillDefinition'), moduleId('OperationHandler')]),
    );
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
