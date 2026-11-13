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
const GET_OBJECTS = 'org.dxos.operation.space.getObjects';

describe('markdown plugin bundle on EDGE', { timeout: 300_000 }, () => {
  const bundleDirs: string[] = [];
  const bundles: LoadedBundle[] = [];
  /** The operation keys the markdown bundle invoked in the space plugin's bundle, in order. */
  const nested: string[] = [];
  let markdown: LoadedBundle;
  let space: LoadedBundle;
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

    space = await load(SPACE_PACKAGE_DIR);
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

  /** Reads one object back through the space plugin's bundle, in its JSON form. */
  const read = async (uri: string): Promise<Record<string, unknown> | undefined> => {
    const result = await space.invoke({ operationKey: GET_OBJECTS, spaceId, input: { objects: [{ '/': uri }] } });
    const output: unknown = result.ok ? result.output : undefined;
    const objects =
      output !== null && typeof output === 'object' && 'objects' in output && Array.isArray(output.objects)
        ? output.objects
        : [];
    return objects[0];
  };

  // The bundle runs without plugin-space's default-parent rule, so `space.addObject` in the space plugin's bundle adds
  // the document, with its text, and files it where documents go. This space has no root collection (a memory space
  // has no `SpaceProperties`), so filing into the root is asserted by EDGE's tests on a Composer space.
  test('creates a document, with its text, through the space plugin in another bundle', async ({ expect }) => {
    const result = await markdown.invoke({
      operationKey: CREATE,
      spaceId,
      input: { name: 'Forecast', content: 'Patchy rain.' },
    });
    expect(nested).toEqual([ADD_OBJECT]);
    const output = result.ok ? result.output : result.error.message;
    expect(output).toMatchObject({ id: expect.stringMatching(/^echo:/) });

    const id = typeof output === 'object' && output !== null && 'id' in output ? String(output.id) : '';
    const document = await read(id);
    expect(document).toMatchObject({ name: 'Forecast', content: { '/': expect.stringMatching(/^echo:/) } });
    const content = document?.content;
    const textUri = content !== null && typeof content === 'object' && '/' in content ? String(content['/']) : '';
    expect(await read(textUri)).toMatchObject({ content: 'Patchy rain.' });
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
