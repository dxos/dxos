//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as Plugin from '@dxos/app-framework/Plugin';

import * as MarkdownPlugin from './MarkdownPlugin';

const PACKAGE_DIR = join(__dirname, '..');

const descriptor = readFileSync(join(PACKAGE_DIR, 'dxplugin.jsonc'), 'utf-8');

/**
 * The descriptor is the plugin's whole entrypoint, so these assert the shape it produces rather than
 * comparing against a hand-written entrypoint — there is no longer one to compare against.
 */
describe('dxplugin.jsonc', () => {
  test('is the source of the plugin metadata', ({ expect }) => {
    expect(MarkdownPlugin.meta.profile).toMatchObject({ key: 'org.dxos.plugin.markdown', name: 'Markdown' });
    expect(MarkdownPlugin.meta.profile).not.toHaveProperty('$schema');
  });

  test('builds the plugin, narrowed to the loading platform', ({ expect }) => {
    // Resolved under the node condition here, so the browser-only modules are absent.
    expect(MarkdownPlugin.make().modules.map(({ id }) => id)).toEqual([
      'org.dxos.plugin.markdown.module.SkillDefinition',
      'org.dxos.plugin.markdown.module.CreateObject',
      'org.dxos.plugin.markdown.module.OperationHandler',
      'org.dxos.plugin.markdown.module.schema',
    ]);
  });

  test('narrows to a subset of the browser modules on each server platform', ({ expect }) => {
    expect(forPlatform('browser').modules).toHaveLength(12);
    expect(forPlatform(undefined).modules).toHaveLength(12);
    expect(forPlatform('node').modules).toHaveLength(4);
    expect(forPlatform('workerd').modules).toHaveLength(3);
  });

  test('declares an activation graph over rehydrated capability tags', ({ expect }) => {
    const state = forPlatform('browser').modules.find(({ id }) => id.endsWith('.MarkdownState'));
    expect(state?.activation.requires.map(({ identifier, arity }) => `${arity}:${identifier}`)).toEqual([
      'single:org.dxos.plugin.attention.capability.viewState',
    ]);
    expect(state?.activation.provides.map(({ identifier }) => identifier)).toEqual([
      'org.dxos.plugin.markdown.capability.editorState',
      'org.dxos.plugin.markdown.capability.editorViews',
    ]);
  });

  test('names a module file that exists', ({ expect }) => {
    for (const { src } of Plugin.parseDescriptor(descriptor).modules) {
      expect(existsSync(join(PACKAGE_DIR, src)), src).toBe(true);
    }
  });
});

const forPlatform = (platform: Plugin.FromManifestOptions['platform']) =>
  Plugin.fromManifest(descriptor, { baseUrl: `file://${PACKAGE_DIR}/`, platform })();
