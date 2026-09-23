//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { CanvasPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('CanvasPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), CanvasPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('translations')]));
    // The drawing variant is browser-only and waits for the illustrator's start event.
    expect(harness.manager.getActive()).not.toContain(moduleId('drawing-variant'));
  }, 20_000);
});
