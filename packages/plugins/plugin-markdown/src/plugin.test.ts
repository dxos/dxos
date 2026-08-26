//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Plugin from '@dxos/app-framework/Plugin';
import { EffectEx } from '@dxos/effect';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import descriptorUrl from '@dxos/plugin-markdown/dxplugin.jsonc';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';

// Loaded once at module scope: a descriptor is data behind a URL, and the plugin arrays below
// are built synchronously.
const MarkdownPlugin = await EffectEx.runPromise(Plugin.loadManifest(descriptorUrl));

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('MarkdownPlugin', () => {
  // Raised from the 15s default: descriptor modules are imported by URL rather than through a
  // vite-transformed relative import, which leaves no headroom under a loaded CI shard.
  test('modules activate on the expected events', { timeout: 30_000 }, async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), MarkdownPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );
  });
});
