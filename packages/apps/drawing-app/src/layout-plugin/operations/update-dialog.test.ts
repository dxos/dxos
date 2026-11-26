//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import { describe, test } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { createTestApp } from '@dxos/app-framework/testing';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

import { DiagramAppCapabilities } from '../types/index.ts';

/** The layout's state and operation handlers, without the app root. */
const LayoutPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.test.diagramLayout'), name: 'Layout' }),
).pipe(
  Plugin.addModule({
    id: 'org.dxos.test.diagramLayout.state',
    activatesOn: ActivationEvents.Startup,
    provides: [DiagramAppCapabilities.LayoutState],
    activate: () =>
      Effect.succeed([
        Capability.contribute(
          DiagramAppCapabilities.LayoutState,
          Atom.make<DiagramAppCapabilities.LayoutState>({
            route: {},
            dialogOpen: false,
            dialogType: 'default',
            dialogDismissals: 0,
            popoverOpen: false,
            popoverKind: 'base',
            sharing: false,
            toasts: [],
            workspace: 'default',
          }).pipe(Atom.keepAlive),
        ),
      ]),
  }),
  Plugin.addModule(AppCapability.operationHandler(() => import('../capabilities/operation-handler.ts'))),
  Plugin.make,
);

describe('LayoutOperation.UpdateDialog', () => {
  test('a close naming a dialog leaves another that has replaced it open', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [ProcessManagerPlugin.make(), LayoutPlugin()] });
    const read = () => harness.registry.get(harness.get(DiagramAppCapabilities.LayoutState));

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:replacing' }));
    await harness.runPromise(
      Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:replaced', state: false }),
    );
    expect(read().dialogOpen).toBe(true);
    expect(read().dialogContent?.component).toBe('dxn:test:replacing');

    await harness.runPromise(
      Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:replacing', state: false }),
    );
    expect(read().dialogOpen).toBe(false);
  });
});
