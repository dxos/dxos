//
// Copyright 2026 DXOS.org
//

import * as Automerge from '@automerge/automerge';
import { generateAutomergeUrl, parseAutomergeUrl } from '@automerge/automerge-repo';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { SpaceDocVersion, createIdFromSpaceKey } from '@dxos/echo-protocol';
import { PublicKey } from '@dxos/keys';
import { type EdgeFunctionEnv, type PluginProtocol } from '@dxos/protocols';

import { buildBundle } from './build-bundle.ts';
import { type DataPlane, type LoadedBundle, loadBundle } from './load-bundle.ts';
import * as PluginBundle from './PluginBundle.ts';

// The space plugin's bundle, built from source the way `check-edge-release` builds it, run alone as EDGE runs it
// (EDGE-PLUGINS D-41), against a space served from memory in place of EDGE's db-service.

const SPACE_PACKAGE_DIR = fileURLToPath(new URL('../../../../plugins/plugin-space', import.meta.url));

/** Declared by plugin-markdown, whose bundle never runs beside the space plugin's on EDGE. */
const DOCUMENT_TYPENAME = 'org.dxos.type.document';

/** Declared by the space plugin itself, so its bundle registers it. */
const COLLECTION_TYPENAME = 'org.dxos.type.collection';

const QUERY_OBJECTS = 'org.dxos.operation.space.queryObjects';
const ADD_OBJECT = 'org.dxos.operation.space.addObject';

type Document = Automerge.Doc<Record<string, unknown>>;

/** EDGE's `DATA_SERVICE` over Automerge documents held in memory; one space, with an empty directory. */
class MemoryDataPlane implements DataPlane {
  readonly #spaces = new Map<string, EdgeFunctionEnv.SpaceMeta>();
  readonly #documents = new Map<string, Document>();

  async createSpace(): Promise<string> {
    const spaceKey = PublicKey.random();
    const spaceId = await createIdFromSpaceKey(spaceKey);
    const rootDocumentId = this.#create({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId, spaceKey: spaceKey.toHex() },
      objects: {},
      links: {},
    });
    this.#spaces.set(spaceId, { spaceKey: spaceKey.toHex(), rootDocumentId });
    return spaceId;
  }

  async getSpaceMeta(spaceId: string): Promise<EdgeFunctionEnv.SpaceMeta | undefined> {
    return this.#spaces.get(spaceId);
  }

  async getDocuments(_spaceId: string, documentIds: string[]): Promise<EdgeFunctionEnv.RawDocument[]> {
    return documentIds.flatMap((documentId) => {
      const document = this.#documents.get(documentId);
      return document === undefined ? [] : [{ documentId, data: Automerge.save(document) }];
    });
  }

  async createDocument(_spaceId: string, initialValue?: Record<string, unknown>): Promise<{ documentId: string }> {
    return { documentId: this.#create(initialValue ?? {}) };
  }

  async changeDocument(_spaceId: string, documentId: string, changes: Uint8Array): Promise<void> {
    const document = this.#documents.get(documentId);
    if (document === undefined) {
      throw new Error(`Document not found: ${documentId}`);
    }
    this.#documents.set(documentId, Automerge.loadIncremental(document, changes));
  }

  #create(initialValue: Record<string, unknown>): string {
    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
    this.#documents.set(documentId, Automerge.from(initialValue));
    return documentId;
  }
}

/** The output of a successful invocation, or the failure's message as the reason it is missing. */
const outputOf = (result: PluginProtocol.InvokeResult): unknown =>
  result.ok ? result.output : { failed: result.error.message };

describe('space plugin bundle on EDGE', { timeout: 180_000 }, () => {
  let bundleDir: string | undefined;
  let bundle: LoadedBundle;
  let spaceId: string;

  beforeAll(async () => {
    bundleDir = await mkdtemp(join(tmpdir(), 'plugin-space-bundle-'));
    await buildBundle(SPACE_PACKAGE_DIR, bundleDir);
    const dataPlane = new MemoryDataPlane();
    spaceId = await dataPlane.createSpace();
    bundle = await loadBundle(await PluginBundle.readBundle(bundleDir), { dataPlane });
  }, 300_000);

  afterAll(async () => {
    await bundle?.[Symbol.asyncDispose]();
    if (bundleDir !== undefined) {
      await rm(bundleDir, { recursive: true, force: true });
    }
  });

  test('adds an object of a type the bundle declares', async ({ expect }) => {
    const result = await bundle.invoke({
      operationKey: ADD_OBJECT,
      spaceId,
      input: { object: { '@type': COLLECTION_TYPENAME, 'name': 'Inbox', 'objects': [] } },
    });
    expect(outputOf(result)).toMatchObject({ id: expect.stringMatching(/^echo:/) });
  });

  // TODO(edge-plugins): The bundle registers only its own plugin's types (D-41), so a typename another plugin
  //   declares is "Schema not found" in `typeFilter` and `instantiate` of plugin-space.
  test.fails('queries objects of a type another plugin declares', async ({ expect }) => {
    const result = await bundle.invoke({
      operationKey: QUERY_OBJECTS,
      spaceId,
      input: { typename: DOCUMENT_TYPENAME },
    });
    expect(outputOf(result)).toMatchObject({ results: [], truncated: false });
  });

  test.fails('adds an object of a type another plugin declares', async ({ expect }) => {
    const result = await bundle.invoke({
      operationKey: ADD_OBJECT,
      spaceId,
      input: { object: { '@type': DOCUMENT_TYPENAME, 'name': 'Notes' } },
    });
    expect(outputOf(result)).toMatchObject({ id: expect.stringMatching(/^echo:/) });
  });

  // TODO(edge-plugins): The host returns the handler's output as Workers RPC clones it, which drops a live ECHO object
  //   outright; operation-service passes it through `snapshotEntities` (`Entity.toJSON`, `{ '/': uri }` refs).
  test.fails('returns an ECHO object in its JSON form, with its `@uri`', async ({ expect }) => {
    const result = await bundle.invoke({
      operationKey: ADD_OBJECT,
      spaceId,
      input: { object: { '@type': COLLECTION_TYPENAME, 'name': 'Archive', 'objects': [] } },
    });
    expect(outputOf(result)).toMatchObject({
      id: expect.stringMatching(/^echo:/),
      object: {
        '@uri': expect.stringMatching(/^echo:/),
        '@type': expect.stringContaining(COLLECTION_TYPENAME),
        'name': 'Archive',
      },
    });
  });
});
