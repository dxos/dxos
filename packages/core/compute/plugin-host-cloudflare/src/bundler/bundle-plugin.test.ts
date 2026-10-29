//
// Copyright 2026 DXOS.org
//

// Releases are bundled here in Node, where esbuild runs, and loaded through the `worker_loaders` binding of a local
// workerd: the path compute-service takes, with nothing simulated.

import { fileURLToPath } from 'node:url';
import { beforeAll, describe, test } from 'vitest';

import { Reply } from '@dxos/compute/testing';
import { Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import * as PluginRelease from '../PluginRelease.ts';
import { TEST_BASE_PLUGIN_KEY, TEST_PLUGIN_KEY } from '../testing/index.ts';
import { bundlePlugin } from './bundle-plugin.ts';
import { checkRelease } from './check-release.ts';
import { loadRelease } from './release-loader.ts';

const TEST_ENTRY = fileURLToPath(new URL('../testing/test-plugin-entry.ts', import.meta.url));
const TEST_BASE_ENTRY = fileURLToPath(new URL('../testing/test-base-plugin-entry.ts', import.meta.url));

describe('EDGE release of the test plugin', { timeout: 120_000 }, () => {
  let files: PluginRelease.Files;
  let externals: string[];

  beforeAll(async () => {
    ({ assets: files, externals } = await bundlePlugin({ entryPoint: TEST_ENTRY, dependencies: [TEST_BASE_ENTRY] }));
  });

  test('is self-contained', ({ expect }) => {
    expect(Object.keys(files)).toContain(PluginRelease.MAIN_MODULE);
    expect(externals.filter((specifier) => !/^(cloudflare|node):/.test(specifier))).toEqual([]);
  });

  test('describes its plugin from inside a Dynamic Worker', async ({ expect }) => {
    await using release = await loadRelease(files);
    const catalog = await release.describe();
    expect(catalog.failures).toEqual([]);
    expect(catalog.plugin.key).toBe(TEST_PLUGIN_KEY);
    expect(catalog.dependencies.map(({ key }) => key)).toEqual([TEST_BASE_PLUGIN_KEY]);
    expect(catalog.types.map(({ typename }) => typename)).toEqual([Type.getTypename(TestSchema.Person)]);
    expect(JSON.stringify(catalog.operations)).toContain(String(Reply.meta.key));
  });

  test('runs an operation inside a Dynamic Worker', async ({ expect }) => {
    await using release = await loadRelease(files);
    expect(await release.invoke({ operationKey: String(Reply.meta.key), input: { hello: 'edge' } })).toEqual({
      hello: 'edge',
    });
    await expect(release.invoke({ operationKey: 'com.example.operation.missing' })).rejects.toThrow(
      /OperationNotFoundError/,
    );
  });

  test('is named by its content', async ({ expect }) => {
    expect(await PluginRelease.hash(files)).toBe(await PluginRelease.hash({ ...files }));
    const changed = { ...files, [PluginRelease.MAIN_MODULE]: new TextEncoder().encode('export default {};') };
    expect(await PluginRelease.hash(changed)).not.toBe(await PluginRelease.hash(files));
  });
});

describe('checkRelease', () => {
  test('passes a release fit to publish', { timeout: 120_000 }, async ({ expect }) => {
    const { manifest, catalog, problems } = await checkRelease({
      entryPoint: TEST_ENTRY,
      dependencies: [TEST_BASE_ENTRY],
    });
    expect(problems).toEqual([]);
    expect(manifest.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(catalog.skills.map(({ key }) => key)).toEqual(['org.dxos.skill.hostTest']);
  });
});

describe('checkRelease without its dependency', () => {
  test('reports the plugin the release is missing', { timeout: 120_000 }, async ({ expect }) => {
    const { problems } = await checkRelease({ entryPoint: TEST_ENTRY });
    expect(problems.join('\n')).toMatch(/failed to load.*missing/);
  });
});
