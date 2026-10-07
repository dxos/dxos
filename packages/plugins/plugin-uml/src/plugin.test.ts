//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import { meta } from '#meta';
import { UmlPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('UmlPlugin', () => {
  test('modules activate on the expected events', { timeout: 60_000 }, async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), IllustratorPlugin.make(), UmlPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('translations')]));
    // The class shape is browser-only and waits for the illustrator's start event, as the canvas variant does.
    expect(harness.manager.getActive()).not.toContain(moduleId('class-node-type'));
  });
});
