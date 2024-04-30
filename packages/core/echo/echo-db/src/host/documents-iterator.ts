//
// Copyright 2024 DXOS.org
//

import { type Doc, view } from '@dxos/automerge/automerge';
import { type DocumentId } from '@dxos/automerge/automerge-repo';
import { type SpaceDoc, type AutomergeHost } from '@dxos/echo-pipeline';
import { headsCodec, type PointerWithHash } from '@dxos/indexing';
import { idCodec } from '@dxos/protocols';

/**
 * Factory for `loadDocuments` iterator.
 */
export const createSelectedDocumentsIterator = (automergeHost: AutomergeHost) =>
  /**
   * Get object data blobs from Automerge Repo by ids.
   */
  // TODO(mykola): Unload automerge handles after usage.
  async function* loadDocuments(objects: PointerWithHash[]) {
    for (const { id, hash } of objects) {
      const { documentId, objectId } = idCodec.decode(id);
      const handle =
        automergeHost.repo.handles[documentId as DocumentId] ?? automergeHost.repo.find(documentId as DocumentId);

      const heads = headsCodec.decode(hash);
      if (!handle.isReady()) {
        // `whenReady` creates a timeout so we guard it with an if to skip it if the handle is already ready.
        await handle.whenReady();
      }
      const doc: Doc<SpaceDoc> = view(handle.docSync(), heads);
      yield doc.objects?.[objectId] ? [{ id, object: doc.objects[objectId], currentHash: hash }] : [];
    }
  };
