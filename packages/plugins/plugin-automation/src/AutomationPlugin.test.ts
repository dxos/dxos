//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AppActivationEvents } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { AutomationPlugin } from './AutomationPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('AutomationPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Skip autoStart: ReactSurface and AppGraphBuilder are browser-only.
    // Note: #capabilities resolves to capabilities/node.ts in Node tests, which only
    // exports ComputeRuntime. AppGraphBuilder/OperationHandler/ReactSurface are undefined
    // in this environment and cannot be tested here.
    await using harness = await createComposerTestApp({
      plugins: [AutomationPlugin()],
      autoStart: false,
    });

    // schema activates on SetupSchema; safe in Node (no browser deps).
    await harness.fire(AppActivationEvents.SetupSchema);
    expect(harness.manager.getActive()).toContain(moduleId('schema'));
  });
});
