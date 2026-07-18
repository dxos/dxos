//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { OnboardingPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('OnboardingPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [OnboardingPlugin({ generateExemplarSpace: false })],
    });

    // All dependency-mode roots, so they activate immediately during the startup dependency pass.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('Settings'),
        moduleId('oauth-recovery-redirect'),
        moduleId('ReactSurface'),
        moduleId('AppGraphBuilder'),
        moduleId('OperationHandler'),
        moduleId('translations'),
      ]),
    );
  });
});
