//
// Copyright 2026 DXOS.org
//

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { type LoadedBundle, MemoryDataPlane, PluginBundle, buildBundle, loadBundle } from '@dxos/plugin-builder';
import { type PluginProtocol } from '@dxos/protocols';

// The markdown plugin's bundle and the space plugin's, each run alone as EDGE runs them (EDGE-PLUGINS D-41), on one
// space served from memory; a nested call from one reaches the other as EDGE's router would route it.

const MARKDOWN_PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url));
const SPACE_PACKAGE_DIR = fileURLToPath(new URL('../../plugin-space', import.meta.url));

const CREATE = 'org.dxos.operation.markdown.create';
const ADD_OBJECT = 'org.dxos.operation.space.addObject';

describe('markdown plugin bundle on EDGE', { timeout: 300_000 }, () => {
  const bundleDirs: string[] = [];
  const bundles: LoadedBundle[] = [];
  /** The operation keys the markdown bundle invoked in the space plugin's bundle, in order. */
  const nested: string[] = [];
  let markdown: LoadedBundle;
  let spaceId: string;

  beforeAll(async () => {
    const dataPlane = new MemoryDataPlane();
    spaceId = await dataPlane.createSpace();
    const typeRegistry = new CatalogTypeRegistry();

    const load = async (packageDir: string, operations?: PluginProtocol.OperationHost) => {
      const bundleDir = await mkdtemp(join(tmpdir(), 'plugin-bundle-'));
      bundleDirs.push(bundleDir);
      await buildBundle(packageDir, bundleDir);
      const bundle = await loadBundle(await PluginBundle.readBundle(bundleDir), {
        dataPlane,
        typeRegistry,
        ...(operations === undefined ? {} : { operations }),
      });
      bundles.push(bundle);
      typeRegistry.publish(await bundle.describe());
      return bundle;
    };

    const space = await load(SPACE_PACKAGE_DIR);
    markdown = await load(MARKDOWN_PACKAGE_DIR, {
      invoke: (operationKey, input, options) => {
        nested.push(operationKey);
        return space.invoke({ operationKey, input, spaceId: options.spaceId ?? spaceId });
      },
    });
  }, 600_000);

  afterAll(async () => {
    for (const bundle of bundles) {
      await bundle[Symbol.asyncDispose]();
    }
    for (const bundleDir of bundleDirs) {
      await rm(bundleDir, { recursive: true, force: true });
    }
  });

  // The bundle runs without plugin-space's default-parent rule, so the document is filed by `space.addObject` in the
  // space plugin's bundle, which has it; filing it in place would only add it to the space.
  test('creates a document through the space plugin in another bundle', async ({ expect }) => {
    const result = await markdown.invoke({
      operationKey: CREATE,
      spaceId,
      input: { name: 'Forecast', content: 'Patchy rain.' },
    });
    expect(result.ok ? result.output : result.error.message).toMatchObject({ id: expect.stringMatching(/^echo:/) });
    expect(nested).toEqual([ADD_OBJECT]);
  });
});

/** EDGE's registry of published types, holding every type the loaded bundles' catalogs list. */
class CatalogTypeRegistry implements PluginProtocol.TypeRegistry {
  readonly #types = new Map<string, PluginProtocol.TypeRecord>();

  publish(catalog: PluginProtocol.Catalog): void {
    for (const type of catalog.types) {
      this.#types.set(type.typename, type);
    }
  }

  async resolveType(typename: string): Promise<PluginProtocol.TypeRecord | undefined> {
    return this.#types.get(typename);
  }
}
