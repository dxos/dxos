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

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import { Type } from '@dxos/echo';
import { SpaceDocVersion, createIdFromSpaceKey } from '@dxos/echo-protocol';
import { DXN, PublicKey } from '@dxos/keys';
import { type DataPlane, type LoadedBundle, PluginBundle, buildBundle, loadBundle } from '@dxos/plugin-builder';
import { type EdgeFunctionEnv, type PluginProtocol } from '@dxos/protocols';

// The agent plugin's bundle, built from source the way `check-edge-release` builds it, run alone as EDGE runs it
// (EDGE-PLUGINS D-41), against a space served from memory in place of EDGE's db-service.

const AGENT_PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url));

const CREATE_AGENT = 'org.dxos.operation.agent.create';

type Document = Automerge.Doc<Record<string, unknown>>;

describe('agent plugin bundle on EDGE', { timeout: 180_000 }, () => {
  let bundleDir: string | undefined;
  let bundle: LoadedBundle;
  let spaceId: string;
  let typeRegistry: EmptyTypeRegistry;
  let dataPlane: MemoryDataPlane;

  beforeAll(async () => {
    bundleDir = await mkdtemp(join(tmpdir(), 'plugin-agent-bundle-'));
    await buildBundle(AGENT_PACKAGE_DIR, bundleDir);
    dataPlane = new MemoryDataPlane();
    spaceId = await dataPlane.createSpace();
    typeRegistry = new EmptyTypeRegistry();
    bundle = await loadBundle(await PluginBundle.readBundle(bundleDir), { dataPlane, typeRegistry });
  }, 300_000);

  afterAll(async () => {
    await bundle?.[Symbol.asyncDispose]();
    if (bundleDir !== undefined) {
      await rm(bundleDir, { recursive: true, force: true });
    }
  });

  // `Instructions`, `Agent` and `Chat` are plugin-assistant's and core types, which the agent bundle does not register
  // (D-41); the operation declares them in `types`, so the host registers them before the handler runs.
  test('creates an agent, writing the types it declares but does not own', async ({ expect }) => {
    // TODO(edge-plugins): The host returns the handler's output as Workers RPC clones it, which cannot clone the `Ref`
    //   this operation returns; operation-service passes it through `snapshotEntities` first. The objects are written
    //   before the output is returned, so the space is checked instead.
    await expect(bundle.invoke({ operationKey: CREATE_AGENT, spaceId, input: { name: 'Scout' } })).rejects.toThrow(
      /DataCloneError/,
    );

    expect(dataPlane.typenames()).toEqual(
      expect.arrayContaining([Instructions.Instructions, Agent.Agent, Chat.Chat].map((type) => Type.getTypename(type))),
    );
    // Declared types never reach the type registry, which here publishes nothing.
    expect(typeRegistry.requests).toEqual([]);
  });
});

/** EDGE's registry of published types, publishing none: every type the operation writes must be declared. */
class EmptyTypeRegistry implements PluginProtocol.TypeRegistry {
  readonly requests: string[] = [];

  async resolveType(typename: string): Promise<PluginProtocol.TypeRecord | undefined> {
    this.requests.push(typename);
    return undefined;
  }
}

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

  /** The typename of every object the space's documents hold. */
  typenames(): string[] {
    return [...this.#documents.values()].flatMap((document) => {
      const objects = field(document, 'objects');
      return isRecord(objects) ? Object.values(objects).flatMap((object) => typenameOf(object) ?? []) : [];
    });
  }

  #create(initialValue: Record<string, unknown>): string {
    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
    this.#documents.set(documentId, Automerge.from(initialValue));
    return documentId;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const field = (value: unknown, key: string): unknown => (isRecord(value) ? value[key] : undefined);

/** An object's typename, from the type DXN its document entry stores under `system.type`. */
const typenameOf = (object: unknown): string | undefined => {
  const uri = field(field(field(object, 'system'), 'type'), '/');
  return typeof uri === 'string' && DXN.isDXN(uri) ? DXN.getName(uri) : undefined;
};
