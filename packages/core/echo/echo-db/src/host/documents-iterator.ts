//
// Copyright 2024 DXOS.org
//

import { type Doc, view } from '@dxos/automerge/automerge';
import { type DocumentId } from '@dxos/automerge/automerge-repo';
import { type SpaceDoc, type AutomergeHost } from '@dxos/echo-pipeline';
import { type ObjectSnapshot, type IdsWithHash } from '@dxos/indexing';
import { log } from '@dxos/log';
import { idCodec } from '@dxos/protocols';

/**
 * Factory for `loadDocuments` iterator.
 */
export const createSelectedDocumentsIterator = (automergeHost: AutomergeHost) =>
  /**
   * Get object data blobs from Automerge Repo by ids.
   */
  // TODO(mykola): Unload automerge handles after usage.
  async function* loadDocuments(objects: IdsWithHash): AsyncGenerator<ObjectSnapshot[], void, void> {
    for (const [id, heads] of objects.entries()) {
      try {
        const { documentId, objectId } = idCodec.decode(id);
        const handle =
          automergeHost.repo.handles[documentId as DocumentId] ?? automergeHost.repo.find(documentId as DocumentId);

        if (!handle.isReady()) {
          // `whenReady` creates a timeout so we guard it with an if to skip it if the handle is already ready.
          await handle.whenReady();
        }
        const doc: Doc<SpaceDoc> = view(handle.docSync(), heads);
        yield doc.objects?.[objectId] ? [{ id, object: doc.objects[objectId], hash: heads }] : [];
      } catch (error) {
        log.error('Error loading document', { heads, id, error });
      }
    }
  };
