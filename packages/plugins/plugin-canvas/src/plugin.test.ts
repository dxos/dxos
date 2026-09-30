//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { CanvasPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('CanvasPlugin', () => {
  // The plugin declares `dependsOn` the illustrator, so the harness boots it too: without it nothing
  // here activates at all, which is the point of the declaration.
  test('modules activate on the expected events', { timeout: 60_000 }, async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), IllustratorPlugin.make(), CanvasPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('translations')]));
    // The drawing variant is browser-only and waits for the illustrator's start event.
    expect(harness.manager.getActive()).not.toContain(moduleId('drawing-variant'));

    // Idle-gated. Fired explicitly: the harness awaits Startup only, so reading `getActive()`
    // without this races the host's idle trickle and the set differs run to run.
    await harness.fire(ActivationEvents.Idle);
    expect(harness.manager.getActive()).toContain(moduleId('Settings'));
  });
});
