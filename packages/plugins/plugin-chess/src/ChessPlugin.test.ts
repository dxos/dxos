//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { GamePlugin } from '@dxos/plugin-game/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ChessPlugin } from '#plugin';

import { meta } from './meta';
import * as ChessOperation from './types/ChessOperation';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('ChessPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), GamePlugin(), ChessPlugin()],
    });

    // Modules expected to be active after a normal startup (headless/node variant). OperationHandler
    // is a dependency-mode root, so it activates immediately too.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );

    // Demand-gated on the assistant's start event, so it must stay off the startup pass.
    expect(harness.manager.getActive()).not.toContain(moduleId('SkillDefinition'));
  });

  test('the skill definition activates when the assistant starts', async ({ expect }) => {
    // Positive coverage for `AssistantStart`, which had none outside plugin-assistant: every
    // non-assistant `SkillDefinition` module (chess, kanban, map, script, table, ...) was only
    // ever asserted absent. A broken body surfaces as a skill the assistant silently never offers.
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), GamePlugin(), ChessPlugin()],
    });

    await harness.fire(AppActivationEvents.AssistantStart);
    expect(harness.manager.getActive()).toContain(moduleId('SkillDefinition'));
    expect(harness.getAll(AppCapabilities.SkillDefinition).length).toBeGreaterThan(0);
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
