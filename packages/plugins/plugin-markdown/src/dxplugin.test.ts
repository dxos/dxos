//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as Plugin from '@dxos/app-framework/Plugin';

import { MarkdownPlugin } from './plugin.node';
import { MarkdownPlugin as MarkdownWorkerPlugin } from './plugin.workerd';

const PACKAGE_DIR = join(__dirname, '..');

const descriptor = readFileSync(join(PACKAGE_DIR, 'dxplugin.jsonc'), 'utf-8');

/**
 * Asserts the descriptor reconstructs the same activation graph as the hand-written entrypoints, not
 * merely that it parses. Compared against the node and workerd variants because `#capabilities`
 * resolves to a server-safe barrel here, so the browser entrypoint's module references are undefined.
 */
describe('dxplugin.jsonc', () => {
  test('declares the same metadata', ({ expect }) => {
    expect(forPlatform('node').meta.profile).toMatchObject(MarkdownPlugin().meta.profile);
  });

  test('reconstructs the node entrypoint', ({ expect }) => {
    expect(spec(forPlatform('node'))).toEqual(spec(MarkdownPlugin()));
  });

  test('reconstructs the workerd entrypoint', ({ expect }) => {
    expect(spec(forPlatform('workerd'))).toEqual(spec(MarkdownWorkerPlugin()));
  });

  test('narrows to a subset of the browser modules on each server platform', ({ expect }) => {
    // Every module is browser-capable, so the browser view is the whole descriptor.
    expect(forPlatform('browser').modules).toHaveLength(12);
    expect(forPlatform(undefined).modules).toHaveLength(12);
    expect(forPlatform('node').modules).toHaveLength(4);
    expect(forPlatform('workerd').modules).toHaveLength(3);
  });

  test('names a module file that exists', ({ expect }) => {
    for (const { src } of Plugin.parseDescriptor(descriptor).modules) {
      expect(existsSync(join(PACKAGE_DIR, src)), src).toBe(true);
    }
  });
});

const forPlatform = (platform: Plugin.FromManifestOptions['platform']) =>
  Plugin.fromManifest(descriptor, { baseUrl: `file://${PACKAGE_DIR}/`, platform })();

const spec = (plugin: Plugin.Plugin) =>
  plugin.modules.map(({ id, activation }) => ({
    id,
    activatesOn: activation.activatesOn,
    requires: activation.requires.map(({ identifier, arity }) => `${arity}:${identifier}`),
    provides: activation.provides.map(({ identifier, arity }) => `${arity}:${identifier}`),
  }));
