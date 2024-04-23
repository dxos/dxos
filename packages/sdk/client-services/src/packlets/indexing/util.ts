//
// Copyright 2024 DXOS.org
//

import { getHeads } from '@dxos/automerge/automerge';
import { type DocHandle } from '@dxos/automerge/automerge-repo';
import { type AutomergeHost } from '@dxos/echo-pipeline';
import { type ObjectSnapshot } from '@dxos/indexing';
import { type ObjectPointerEncoded, idCodec } from '@dxos/protocols';

/**
 * Factory for `loadDocuments` iterator.
 */
export const createSelectedDocumentsIterator = (automergeHost: AutomergeHost) =>
  /**
   * Get object data blobs from Automerge Repo by ids.
   * @param ids
   */
  // TODO(mykola): Unload automerge handles after usage.
  async function* loadDocuments(ids: ObjectPointerEncoded[]) {
    for (const id of ids) {
      const { documentId, objectId } = idCodec.decode(id);
      const handle = automergeHost.repo.find(documentId as any);
      if (!handle.isReady()) {
        // `whenReady` creates a timeout so we guard it with an if to skip it if the handle is already ready.
        await handle.whenReady();
      }
      const doc = handle.docSync();
      const hash = getHeads(doc).join('');
      yield doc.objects?.[objectId] ? [{ id, object: doc.objects[objectId], currentHash: hash }] : [];
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

      if (!handle.isReady()) {
        // `whenReady` creates a timeout so we guard it with an if to skip it if the handle is already ready.
        await handle.whenReady();
      }
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
