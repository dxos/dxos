//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { AppActivationEvents } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { OnboardingPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('OnboardingPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [OnboardingPlugin({ generateExemplarSpace: false })],
    });

    // Startup + SetupReactSurface activate core modules.
    // ProcessManagerPlugin fires SetupProcessManager on Startup → OperationHandler activates.
    // GraphPlugin fires SetupAppGraph on Startup (after SetupSettings) → AppGraphBuilder activates.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('Settings'),
        moduleId('oauth-recovery-redirect'),
        moduleId('ReactSurface'),
        moduleId('AppGraphBuilder'),
        moduleId('OperationHandler'),
      ]),
    );

    // Translations activate on SetupTranslations, which is fired separately from Startup.
    await harness.fire(AppActivationEvents.SetupTranslations);
    expect(harness.manager.getActive()).toContain(moduleId('translations'));
  });
});
