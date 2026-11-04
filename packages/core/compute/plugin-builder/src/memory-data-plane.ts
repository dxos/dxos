//
// Copyright 2026 DXOS.org
//

import * as Automerge from '@automerge/automerge';
import { generateAutomergeUrl, parseAutomergeUrl } from '@automerge/automerge-repo';

import { SpaceDocVersion, createIdFromSpaceKey } from '@dxos/echo-protocol';
import { PublicKey } from '@dxos/keys';
import { type EdgeFunctionEnv } from '@dxos/protocols';

import { type DataPlane } from './load-bundle.ts';

type Document = Automerge.Doc<Record<string, unknown>>;

/**
 * EDGE's `DATA_SERVICE` over Automerge documents held in memory, for running bundles against a space without the
 * db-service Durable Objects; each space starts with an empty directory.
 */
export class MemoryDataPlane implements DataPlane {
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
