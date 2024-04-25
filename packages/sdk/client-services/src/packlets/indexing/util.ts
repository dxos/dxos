//
// Copyright 2024 DXOS.org
//

import { getHeads } from '@dxos/automerge/automerge';
import { type DocumentId, type DocHandle } from '@dxos/automerge/automerge-repo';
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
      const handle =
        automergeHost.repo.handles[documentId as DocumentId] ?? automergeHost.repo.find(documentId as DocumentId);
      if (!handle.isReady()) {
        // `whenReady` creates a timeout so we guard it with an if to skip it if the handle is already ready.
        await handle.whenReady();
      }
      const doc = handle.docSync();
      const hash = getHeads(doc).join('');
      yield doc.objects?.[objectId] ? [{ id, object: doc.objects[objectId], currentHash: hash }] : [];
    }
  };
