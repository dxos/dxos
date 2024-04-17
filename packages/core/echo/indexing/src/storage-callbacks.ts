//
// Copyright 2024 DXOS.org
//

import { getHeads } from '@dxos/automerge/automerge';
import { type DocumentId, type StorageKey } from '@dxos/automerge/automerge-repo';
import { type SpaceDoc, type AutomergeHost, type StorageCallbacks } from '@dxos/echo-pipeline';
import { idCodec } from '@dxos/protocols';

import { type IndexMetadataStore } from './index-metadata-store';

export const createStorageCallbacks = ({
  host,
  metadata,
}: {
  host: () => AutomergeHost;
  metadata: IndexMetadataStore;
}): StorageCallbacks => ({
  beforeSave: async ({ path, batch }) => {
    const getDocumentIdFromPath = (path: StorageKey): DocumentId => path[0] as DocumentId;
    const handle = host().repo.handles[getDocumentIdFromPath(path)];
    if (!handle) {
      return;
    }
    const doc = handle.docSync();
    if (!doc) {
      return;
    }

    const heads = getHeads(doc);
    const lastAvailableHash = heads.join('');

    const getDocumentObjects = (doc: SpaceDoc): string[] => Object.keys(doc.objects ?? {});

    const objectIds = getDocumentObjects(doc);
    const encodedIds = objectIds.map((objectId) => idCodec.encode({ documentId: handle.documentId, objectId }));
    const idToLastHash = new Map(encodedIds.map((id) => [id, lastAvailableHash]));
    metadata.markDirty(idToLastHash, batch);
  },

  afterSave: async () => metadata.afterMarkDirty(),
});
