//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AppActivationEvents } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';
import { PresenterPlugin } from './PresenterPlugin';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('PresenterPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [PresenterPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('ReactSurface')]));

    await harness.fire(AppActivationEvents.SetupSettings);
    expect(harness.manager.getActive()).toContain(moduleId('PresenterSettings'));
  }, 20_000);
});
