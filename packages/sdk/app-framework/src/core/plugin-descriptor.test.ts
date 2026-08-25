//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import * as ActivationEvent from './activation-event';
import * as Capability from './capability';
import * as Plugin from './plugin';

const DESCRIPTOR = `
{
  // Plugin identity — the same fields dx.config.ts used to carry.
  "key": "org.dxos.plugin.test",
  "name": "Test",
  "description": "A // b /* c */ d", /* not a comment */
  "modules": [
    {
      "id": "Surface",
      "src": "./capabilities/surface.ts",
      "provides": ["org.dxos.test.surface"],
      "requires": [{ "id": "org.dxos.test.state", "arity": "single" }],
      "activatesOn": {
        "oneOf": [{ "id": "org.dxos.test.event.surfacesRequested", "specifier": "org.dxos.role.article" }],
      },
    },
    {
      "id": "NodeOnly",
      "src": "./capabilities/node.ts",
      "platforms": ["node"],
    },
  ],
}
`;

describe('Plugin.fromManifest', () => {
  test('parses JSONC with comments and trailing commas', ({ expect }) => {
    expect(Plugin.fromManifest(DESCRIPTOR, { baseUrl: 'https://example.com/' }).meta.profile).toMatchObject({
      key: 'org.dxos.plugin.test',
      name: 'Test',
      description: 'A // b /* c */ d',
    });
  });

  test('derives module ids from the plugin key', ({ expect }) => {
    expect(parse()().modules.map(({ id }) => id)).toEqual([
      'org.dxos.plugin.test.module.Surface',
      'org.dxos.plugin.test.module.NodeOnly',
    ]);
  });

  test('rehydrates capability references, defaulting a bare string to multi arity', ({ expect }) => {
    const [surface] = parse()().modules;
    expect(surface.activation.provides).toEqual([
      expect.objectContaining({ identifier: 'org.dxos.test.surface', arity: 'multi' }),
    ]);
    expect(surface.activation.requires).toEqual([
      expect.objectContaining({ identifier: 'org.dxos.test.state', arity: 'single' }),
    ]);
  });

  test('rehydrates a capability reference to the same context key the owner exported', ({ expect }) => {
    const Surface = Capability.make<{ value: string }>()('org.dxos.test.surface');
    expect(Capability.fromRef('org.dxos.test.surface').key).toEqual(Surface.key);
  });

  test('rehydrates activation events', ({ expect }) => {
    const [surface] = parse()().modules;
    expect(surface.activation.activatesOn).toEqual(
      ActivationEvent.oneOf(ActivationEvent.make('org.dxos.test.event.surfacesRequested', 'org.dxos.role.article')),
    );
  });

  test('defaults an unstated activation to the idle wave', ({ expect }) => {
    const [, nodeOnly] = parse()().modules;
    expect(nodeOnly.activation.activatesOn).toEqual(ActivationEvent.Idle);
  });

  test('filters modules by platform', ({ expect }) => {
    expect(parse({ platform: 'browser' })().modules.map(({ id }) => id)).toEqual([
      'org.dxos.plugin.test.module.Surface',
    ]);
    expect(parse({ platform: 'node' })().modules).toHaveLength(2);
  });

  test('keeps a comma that sits inside a string value', ({ expect }) => {
    // The trailing-comma cleanup must not reach into copied string literals; a description is free
    // text and routinely contains `, }`.
    const descriptor = Plugin.parseDescriptor('{"key":"org.dxos.plugin.test","name":"A, } B","modules":[]}');
    expect(descriptor.name).toEqual('A, } B');
  });

  test('reports a malformed descriptor as a descriptor error', ({ expect }) => {
    expect(() => Plugin.parseDescriptor('{ not json')).toThrow(Plugin.PluginDescriptorError);
    expect(() => Plugin.parseDescriptor('{"name":"no key"}')).toThrow(Plugin.PluginDescriptorError);
  });

  test('does not leak descriptor-only fields into the plugin profile', ({ expect }) => {
    const withSchema = { key: 'org.dxos.plugin.test', name: 'Test', $schema: './x.json', modules: [] };
    expect(Plugin.fromManifest(withSchema).meta.profile).not.toHaveProperty('$schema');
  });

  test('fails a relative src with no base url', ({ expect }) => {
    expect(() => Plugin.fromManifest(DESCRIPTOR)).toThrow(Plugin.PluginDescriptorError);
  });

  test('accepts a module namespace, as produced by importing a descriptor', ({ expect }) => {
    const namespace = { default: { key: 'org.dxos.plugin.test', name: 'Test', modules: [] } };
    expect(Plugin.fromManifest(namespace).meta.profile.key).toEqual('org.dxos.plugin.test');
  });

  test('loads a module body by importing its src', async ({ expect }) => {
    // The activate effect is what the manager runs; here only its import step is exercised, via a
    // file URL, since the descriptor path deliberately hides the import from the bundler.
    const url = pathToFileURL(join(__dirname, 'plugin.ts')).toString();
    expect(
      Plugin.fromManifest(`{"key":"org.dxos.plugin.test","name":"T","modules":[{"id":"M","src":"${url}"}]}`)().modules,
    ).toHaveLength(1);
  });
});

const parse = (options?: Plugin.FromManifestOptions) =>
  Plugin.fromManifest(DESCRIPTOR, { baseUrl: 'https://example.com/p/dxplugin.jsonc', ...options });
