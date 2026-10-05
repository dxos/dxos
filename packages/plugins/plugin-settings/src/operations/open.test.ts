//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { createTestApp } from '@dxos/app-framework/testing';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as GraphPlugin from '@dxos/plugin-graph/GraphPlugin';

import { SettingsPlugin } from '#plugin';

/** A layout that records the operations settings asks of it, in order; `companions: false` is one with none (Spotlight). */
const makeRecordingLayout = (calls: { op: string; input: unknown }[], { companions = true } = {}) =>
  Plugin.define({ profile: { key: 'org.dxos.plugin.settings.test.layout', name: 'Layout (test)' } }).pipe(
    Plugin.addModule(
      Capability.inlineModule('operation-handler', { provides: [Capabilities.OperationHandler] }, () =>
        Effect.succeed([
          Capability.contribute(
            Capabilities.OperationHandler,
            OperationHandlerSet.make(
              Operation.withHandler(LayoutOperation.SwitchWorkspace, (input) =>
                Effect.sync(() => void calls.push({ op: 'switchWorkspace', input })),
              ),
              Operation.withHandler(LayoutOperation.Open, (input) =>
                Effect.sync(() => {
                  calls.push({ op: 'open', input });
                  return input.subject;
                }),
              ),
              ...(companions
                ? [
                    Operation.withHandler(LayoutOperation.UpdateCompanion, (input) =>
                      Effect.sync(() => void calls.push({ op: 'updateCompanion', input })),
                    ),
                  ]
                : []),
            ),
          ),
        ]),
      ),
    ),
    Plugin.make,
  );

describe('SettingsOperation.Open', () => {
  test('closes the companion once the settings are open', async ({ expect }) => {
    const calls: { op: string; input: unknown }[] = [];
    await using harness = await createTestApp({
      plugins: [GraphPlugin.make(), ProcessManagerPlugin(), SettingsPlugin(), makeRecordingLayout(calls)()],
    });

    await harness.invoke(SettingsOperation.Open, { plugin: 'org.dxos.plugin.debug' });
    expect(calls.map(({ op }) => op)).toEqual(['switchWorkspace', 'open', 'updateCompanion']);
    expect(calls.at(-1)?.input).toEqual({ subject: null });
  });

  test('opens in a layout with no companions', async ({ expect }) => {
    const calls: { op: string; input: unknown }[] = [];
    await using harness = await createTestApp({
      plugins: [
        GraphPlugin.make(),
        ProcessManagerPlugin(),
        SettingsPlugin(),
        makeRecordingLayout(calls, { companions: false })(),
      ],
    });

    await harness.invoke(SettingsOperation.Open, { plugin: 'org.dxos.plugin.debug' });
    expect(calls.map(({ op }) => op)).toEqual(['switchWorkspace', 'open']);
  });
});
