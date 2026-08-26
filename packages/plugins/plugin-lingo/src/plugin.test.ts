//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Plugin from '@dxos/app-framework/Plugin';
import { EffectEx } from '@dxos/effect';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import markdownDescriptorUrl from '@dxos/plugin-markdown/dxplugin.jsonc';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { LingoPlugin } from '#plugin';

// Loaded once at module scope: a descriptor is data behind a URL, and the plugin arrays below
// are built synchronously.
const MarkdownPlugin = await EffectEx.runPromise(Plugin.loadManifest(markdownDescriptorUrl));

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('LingoPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      // Markdown is declared in `dependsOn`, so the manager refuses to resolve Lingo without it.
      plugins: [ClientPlugin.make({}), MarkdownPlugin(), LingoPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('schema')]));
    // ReactSurface is role-gated (SurfacesRequested) and parks until its role renders.
    expect(harness.manager.getActive()).not.toContain(moduleId('ReactSurface'));
  }, 20_000);
});
