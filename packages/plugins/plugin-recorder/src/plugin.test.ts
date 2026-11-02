//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as FilePlugin from '@dxos/plugin-file/FilePlugin';
import * as PresenterPlugin from '@dxos/plugin-presenter/PresenterPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as RecorderPlugin from '#meta';

import { RecorderNamespace } from './namespace.ts';

const plugins = () => [ClientPlugin.make({}), FilePlugin.make(), PresenterPlugin.make(), RecorderPlugin.make()];

await Harness.preload({ plugins: plugins() });

const moduleId = (name: string) => `${RecorderNamespace.key}.module.${name}`;

describe('RecorderPlugin', () => {
  test('registers its modules', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: plugins(),
    });

    const registered = harness.manager.getModules().map((module) => module.id);
    // The recorder service and the surfaces need a browser, so a node host registers only the headless modules.
    expect(registered).toEqual(expect.arrayContaining(['schema', 'Settings', 'AppGraphBuilder'].map(moduleId)));
    expect(registered).not.toContain(moduleId('Recorder'));
  }, 20_000);
});
