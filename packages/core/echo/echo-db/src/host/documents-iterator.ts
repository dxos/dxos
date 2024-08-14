//
// Copyright 2024 DXOS.org
//

import * as A from '@dxos/automerge/automerge';
import { type DocumentId } from '@dxos/automerge/automerge-repo';
import { Context } from '@dxos/context';
import { getSpaceKeyFromDoc, type AutomergeHost } from '@dxos/echo-pipeline';
import { SpaceDocVersion, type SpaceDoc } from '@dxos/echo-protocol';
import { type ObjectSnapshot, type IdToHeads } from '@dxos/indexing';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ObjectPointerVersion, objectPointerCodec } from '@dxos/protocols';

const LOG_VIEW_OPERATION_THRESHOLD = 300;

/**
 * Factory for `loadDocuments` iterator.
 */
export const createSelectedDocumentsIterator = (automergeHost: AutomergeHost) =>
  /**
   * Get object data blobs from Automerge Repo by ids.
   */
  // TODO(mykola): Unload automerge handles after usage.
  async function* loadDocuments(objects: IdToHeads): AsyncGenerator<ObjectSnapshot[], void, void> {
    for (const [id, heads] of objects.entries()) {
      try {
        const { documentId, objectId } = objectPointerCodec.decode(id);
        const handle = await automergeHost.loadDoc(Context.default(), documentId as DocumentId);

        let doc: A.Doc<SpaceDoc> = handle.docSync();
        invariant(doc);

        const currentHeads = A.getHeads(doc);

        // Checkout the requested version of the document.
        if (!A.equals(currentHeads, heads)) {
          const begin = Date.now();
          // `view` can take a long time even if the document is already at the right version.
          doc = A.view(doc, heads);
          const end = Date.now();
          if (end - begin > LOG_VIEW_OPERATION_THRESHOLD) {
            log.info('Checking out document version is taking too long', {
              duration: end - begin,
              requestedHeads: heads,
              originalHeads: currentHeads,
            });
          }
        }

        // Skip outdated docs.
        if (doc.version !== SpaceDocVersion.CURRENT) {
          continue;
        }

        if (!doc.objects?.[objectId]) {
          continue;
        }

        // Upgrade V0 object pointers to V1.
        let newId = id;
        if (objectPointerCodec.getVersion(id) === ObjectPointerVersion.V0) {
          const spaceKey = getSpaceKeyFromDoc(doc) ?? undefined;
          newId = objectPointerCodec.encode({ documentId, objectId, spaceKey });
        }

        yield [{ id: newId, object: doc.objects![objectId], heads }];
      } catch (error) {
        log.error('Error loading document', { heads, id, error });
      }
    }
  };
