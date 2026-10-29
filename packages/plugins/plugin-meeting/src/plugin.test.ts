//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as MeetingPlugin from '#meta';

import { MeetingNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), MeetingPlugin.make()] });

const moduleId = (name: string) => `${MeetingNamespace.key}.module.${name}`;

describe('MeetingPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), MeetingPlugin.make()],
    });

    // AppGraphBuilder requires CallsCapabilities.Manager, which the headless (node) variant of
    // plugin-calls does not provide, so it does not activate in this harness. OperationHandler is a
    // dependency-mode root, so it activates immediately. ReactSurface is gated on roles.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );
  });
});
