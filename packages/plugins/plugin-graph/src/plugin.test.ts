//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { createTestApp } from '@dxos/app-framework/testing';

import * as GraphPlugin from '#meta';

import { GraphNamespace } from './namespace.ts';

const moduleId = (name: string) => `${GraphNamespace.key}.module.${name}`;

describe('GraphPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Use createTestApp directly — createComposerTestApp already includes GraphPlugin.
    await using harness = await createTestApp({
      plugins: [GraphPlugin.make(), ProcessManagerPlugin.make()],
    });

    // Graph activates on Startup; fires SetupAppGraph + SetupMetadata before, AppGraphReady after.
    expect(harness.manager.getActive()).toContain(moduleId('Graph'));
  });
});
