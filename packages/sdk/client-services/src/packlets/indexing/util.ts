//
// Copyright 2024 DXOS.org
//

import { getHeads } from '@dxos/automerge/automerge';
import { type DocHandle } from '@dxos/automerge/automerge-repo';
import { warnAfterTimeout } from '@dxos/debug';
import { type AutomergeHost } from '@dxos/echo-pipeline';
import { type ObjectSnapshot } from '@dxos/indexing';
import { idCodec } from '@dxos/protocols';

/**
 * Factory for `loadDocuments` iterator.
 */
export const createSelectedDocumentsIterator = (automergeHost: AutomergeHost) =>
  /**
   * Get object data blobs from Automerge Repo by ids.
   * @param ids
   */
  // TODO(mykola): Unload automerge handles after usage.
  async function* loadDocuments(ids: string[]) {
    for (const id of ids) {
      const { documentId, objectId } = idCodec.decode(id);
      const handle = automergeHost.repo.find(documentId as any);
      await warnAfterTimeout(5000, 'to long to load doc', () => handle.whenReady());
      const doc = handle.docSync();
      const hash = getHeads(doc).join('');
      yield [{ id, object: doc.objects[objectId], currentHash: hash }];
    }
  };

/**
 * Factory for `getAllDocuments` iterator.
 */
export const createDocumentsIterator = (automergeHost: AutomergeHost) =>
  /**
   * Recursively get all object data blobs from Automerge Repo.
   * @param ids
   */
  // TODO(mykola): Unload automerge handles after usage.
  async function* getAllDocuments(): AsyncGenerator<ObjectSnapshot[], void, 'done'> {
    /** visited automerge handles */
    const visited = new Set<string>();

    async function* getObjectsFromHandle(handle: DocHandle<any>): AsyncGenerator<ObjectSnapshot[]> {
      if (visited.has(handle.documentId)) {
        return;
      }

      await warnAfterTimeout(5000, 'to long to load doc', () => handle.whenReady());
      const doc = handle.docSync();

      const heads = getHeads(doc);

      if (doc.objects) {
        yield Object.entries(doc.objects as { [key: string]: any }).map(([objectId, object]) => {
          return {
            id: idCodec.encode({ documentId: handle.documentId, objectId }),
            object,
            currentHash: heads.join(''),
          };
        });
      }

      if (doc.links) {
        for (const id of Object.values(doc.links as { [echoId: string]: string })) {
          if (visited.has(id)) {
            continue;
          }
          const linkHandle = automergeHost.repo.find(id as any);
          for await (const result of getObjectsFromHandle(linkHandle)) {
            yield result;
          }
        }
      }

      visited.add(handle.documentId);
    }

    for (const handle of Object.values(automergeHost.repo.handles)) {
      if (visited.has(handle.documentId)) {
        continue;
      }
      for await (const result of getObjectsFromHandle(handle)) {
        yield result;
      }
      visited.add(handle.documentId);
    }
  };
