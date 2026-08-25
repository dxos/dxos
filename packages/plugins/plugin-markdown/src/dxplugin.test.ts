//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as Plugin from '@dxos/app-framework/Plugin';

import { MarkdownPlugin } from './plugin.node';
import { MarkdownPlugin as MarkdownWorkerPlugin } from './plugin.workerd';

const PACKAGE_DIR = join(__dirname, '..');

const descriptor = readFileSync(join(PACKAGE_DIR, 'dxplugin.jsonc'), 'utf-8');

const forPlatform = (platform: Plugin.FromManifestOptions['platform']) =>
  Plugin.fromManifest(descriptor, { baseUrl: `file://${PACKAGE_DIR}/`, platform })();

/**
 * Fidelity of the serialized entrypoint against the hand-written ones. The descriptor is the
 * plugin's shape as data, so what has to hold is that it reconstructs the *same* activation graph —
 * same modules, same order, same waves, same capability edges — not merely that it parses.
 *
 * Compared against the node and workerd entrypoints rather than the browser one because
 * `#capabilities` resolves to a server-safe barrel here: importing the browser entrypoint under the
 * node condition yields undefined module references, which is exactly the platform split
 * `platforms` exists to express.
 */
describe('dxplugin.jsonc', () => {
  const spec = (plugin: Plugin.Plugin) =>
    plugin.modules.map(({ id, activation }) => ({
      id,
      activatesOn: activation.activatesOn,
      requires: activation.requires.map(({ identifier, arity }) => `${arity}:${identifier}`),
      provides: activation.provides.map(({ identifier, arity }) => `${arity}:${identifier}`),
    }));

  it('declares the same metadata', () => {
    expect(forPlatform('node').meta.profile).toMatchObject(MarkdownPlugin().meta.profile);
  });

  it('reconstructs the node entrypoint', () => {
    expect(spec(forPlatform('node'))).toEqual(spec(MarkdownPlugin()));
  });

  it('reconstructs the workerd entrypoint', () => {
    expect(spec(forPlatform('workerd'))).toEqual(spec(MarkdownWorkerPlugin()));
  });

  it('narrows to a subset of the browser modules on each server platform', () => {
    // Every module is browser-capable, so the browser view is the whole descriptor.
    expect(forPlatform('browser').modules).toHaveLength(12);
    expect(forPlatform(undefined).modules).toHaveLength(12);
    expect(forPlatform('node').modules).toHaveLength(4);
    expect(forPlatform('workerd').modules).toHaveLength(3);
  });

  it('names a module file that exists', () => {
    for (const { src } of Plugin.parseDescriptor(descriptor).modules) {
      expect(existsSync(join(PACKAGE_DIR, src)), src).toBe(true);
    }
  });
});
