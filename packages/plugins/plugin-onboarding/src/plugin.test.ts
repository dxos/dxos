//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as Harness from '@dxos/plugin-testing/Harness';

import * as OnboardingPlugin from '#meta';
import { meta } from '#meta';

await Harness.preload({ plugins: [OnboardingPlugin.make({ generateDemoSpace: false })] });

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('OnboardingPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [OnboardingPlugin.make({ generateDemoSpace: false })],
    });

    // All dependency-mode roots, so they activate immediately during the startup dependency pass.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('OAuthRecoveryRedirect'),
        moduleId('AppGraphBuilder'),
        moduleId('OperationHandler'),
        moduleId('translations'),
      ]),
    );

    expect(harness.manager.getActive()).not.toContain(moduleId('SpaceTemplates'));
    expect(harness.manager.getActive()).not.toContain(moduleId('MigrateDemoSpace'));
  });
});
