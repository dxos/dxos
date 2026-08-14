//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { MeetingPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('MeetingPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), MeetingPlugin()],
    });

    // AppGraphBuilder requires CallsCapabilities.Manager, which the headless (node) variant of
    // plugin-calls does not provide, so it does not activate in this harness. OperationHandler is a
    // dependency-mode root, so it activates immediately. ReactSurface is gated on roles.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );
  });
});
