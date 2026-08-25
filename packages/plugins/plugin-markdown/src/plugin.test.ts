//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';

import * as MarkdownPlugin from './MarkdownPlugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('MarkdownPlugin', () => {
  // Raised from the 15s default: descriptor modules are imported by URL rather than through a
  // vite-transformed relative import, which leaves no headroom under a loaded CI shard.
  test('modules activate on the expected events', { timeout: 30_000 }, async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), MarkdownPlugin.make()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );
  });
});
