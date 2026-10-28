//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import { meta } from '#meta';
import { MeetingRecorderPlugin } from '#plugin';

await Harness.preload({ plugins: [ClientPlugin.make({}), MeetingRecorderPlugin()] });

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('MeetingRecorderPlugin', () => {
  test('modules activate on the expected events', { timeout: 30_000 }, async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), MeetingRecorderPlugin()],
    });

    // The harness's idle trickle fires the plugin start event, which brings up the recorder modules;
    // ReactSurface waits for its status-bar role.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('Bridge'),
        moduleId('OperationHandler'),
        moduleId('Recorder'),
        moduleId('RecorderState'),
      ]),
    );
  });
});
