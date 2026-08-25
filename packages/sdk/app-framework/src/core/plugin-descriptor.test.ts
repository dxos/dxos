//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
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

const parse = (options?: Plugin.FromManifestOptions) =>
  Plugin.fromManifest(DESCRIPTOR, { baseUrl: 'https://example.com/p/dxplugin.jsonc', ...options });

describe('Plugin.fromManifest', () => {
  it('parses JSONC with comments and trailing commas', () => {
    expect(Plugin.fromManifest(DESCRIPTOR, { baseUrl: 'https://example.com/' }).meta.profile).toMatchObject({
      key: 'org.dxos.plugin.test',
      name: 'Test',
      description: 'A // b /* c */ d',
    });
  });

  it('derives module ids from the plugin key', () => {
    expect(parse()().modules.map(({ id }) => id)).toEqual([
      'org.dxos.plugin.test.module.Surface',
      'org.dxos.plugin.test.module.NodeOnly',
    ]);
  });

  it('rehydrates capability references, defaulting a bare string to multi arity', () => {
    const [surface] = parse()().modules;
    expect(surface.activation.provides).toEqual([
      expect.objectContaining({ identifier: 'org.dxos.test.surface', arity: 'multi' }),
    ]);
    expect(surface.activation.requires).toEqual([
      expect.objectContaining({ identifier: 'org.dxos.test.state', arity: 'single' }),
    ]);
  });

  it('rehydrates a capability reference to the same context key the owner exported', () => {
    const Surface = Capability.make<{ value: string }>()('org.dxos.test.surface');
    expect(Capability.fromRef('org.dxos.test.surface').key).toEqual(Surface.key);
  });

  it('rehydrates activation events', () => {
    const [surface] = parse()().modules;
    expect(surface.activation.activatesOn).toEqual(
      ActivationEvent.oneOf(ActivationEvent.make('org.dxos.test.event.surfacesRequested', 'org.dxos.role.article')),
    );
  });

  it('defaults an unstated activation to the idle wave', () => {
    const [, nodeOnly] = parse()().modules;
    expect(nodeOnly.activation.activatesOn).toEqual(ActivationEvent.Idle);
  });

  it('filters modules by platform', () => {
    expect(parse({ platform: 'browser' })().modules.map(({ id }) => id)).toEqual([
      'org.dxos.plugin.test.module.Surface',
    ]);
    expect(parse({ platform: 'node' })().modules).toHaveLength(2);
  });

  it('fails a relative src with no base url', () => {
    expect(() => Plugin.fromManifest(DESCRIPTOR)).toThrow(Plugin.PluginDescriptorError);
  });

  it('accepts a module namespace, as produced by importing a descriptor', () => {
    const namespace = { default: { key: 'org.dxos.plugin.test', name: 'Test', modules: [] } };
    expect(Plugin.fromManifest(namespace).meta.profile.key).toEqual('org.dxos.plugin.test');
  });

  it('loads a module body by importing its src', async () => {
    // The activate effect is what the manager runs; here only its import step is exercised, via a
    // file URL, since the descriptor path deliberately hides the import from the bundler.
    const url = pathToFileURL(join(__dirname, 'plugin.ts')).toString();
    expect(
      Plugin.fromManifest(`{"key":"org.dxos.plugin.test","name":"T","modules":[{"id":"M","src":"${url}"}]}`)().modules,
    ).toHaveLength(1);
  });
});
