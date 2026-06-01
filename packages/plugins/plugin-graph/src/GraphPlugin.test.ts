//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { DXN } from '@dxos/keys';

import { GraphPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('GraphPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Use createTestApp directly — createComposerTestApp already includes GraphPlugin.
    await using harness = await createTestApp({
      plugins: [GraphPlugin(), ProcessManagerPlugin()],
    });

    // Graph activates on Startup; fires SetupAppGraph + SetupMetadata before, AppGraphReady after.
    expect(harness.manager.getActive()).toContain(moduleId('Graph'));
  });
});
