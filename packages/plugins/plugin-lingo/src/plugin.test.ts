//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as LingoPlugin from '#meta';

import { LingoNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), MarkdownPlugin.make(), LingoPlugin.make()] });

const moduleId = (name: string) => `${LingoNamespace.key}.module.${name}`;

describe('LingoPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      // Markdown is declared in `dependsOn`, so the manager refuses to resolve Lingo without it.
      plugins: [ClientPlugin.make({}), MarkdownPlugin.make(), LingoPlugin.make()],
    });

    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('schema')]));
    // ReactSurface is role-gated (SurfacesRequested) and parks until its role renders.
    expect(harness.manager.getActive()).not.toContain(moduleId('ReactSurface'));
  }, 20_000);
});
