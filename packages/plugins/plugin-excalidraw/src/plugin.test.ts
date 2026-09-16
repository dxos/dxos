//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { ExcalidrawPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('ExcalidrawPlugin', () => {
  // Boot imports start-gated module bodies (the harness fires the plugin's start event), which
  // can exceed the default 15s under vite-node transform load.
  test('modules activate on the event that gates them', { timeout: 60_000 }, async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), IllustratorPlugin.make(), ExcalidrawPlugin()],
    });

    // `DrawingVariant` is annotated `environments: []` — it hands React article/card components
    // to plugin-illustrator. Vitest resolves `#capabilities` under the `node` condition, where
    // the generated barrel stubs it as `undefined` and `Plugin.addModule` skips it, so it cannot
    // activate here however the gate fires. Asserting the absence is the only claim this runtime
    // can make about it, and it is worth making: it proves the annotation keeps the module (and
    // the React it drags in) out of the headless barrel.
    expect(harness.manager.getActive()).not.toContain(moduleId('drawing-variant'));

    // Role-gated: no `article` surface has mounted, so the surface module must stay inactive —
    // this is the demand gate the plugin depends on, so assert it rather than assume it.
    expect(harness.manager.getActive()).not.toContain(moduleId('ReactSurface'));

    // Idle-gated. Fired explicitly: the harness awaits Startup only, so reading `getActive()`
    // without this races the host's idle trickle and the set differs run to run.
    await harness.fire(ActivationEvents.Idle);
    expect(harness.manager.getActive()).toContain(moduleId('Settings'));
  });
});
