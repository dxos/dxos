//
// Copyright 2025 DXOS.org
//

import type { DocumentId } from '@automerge/automerge-repo';

import { assertArgument, failedInvariant, invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { SpaceArchiveFileStructure, type SpaceArchiveMetadata } from '@dxos/protocols';
import type { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

export type ExtractedSpaceArchive = {
  metadata: SpaceArchiveMetadata;
  documents: Record<DocumentId, Uint8Array>;
};

export const extractSpaceArchive = async (archive: SpaceArchive): Promise<ExtractedSpaceArchive> => {
  const { Archive } = await import('@obsidize/tar-browserify');
  const { entries } = await Archive.extract(archive.contents);
  const metadataEntry = entries.find((entry) => entry.fileName === SpaceArchiveFileStructure.metadata);
  assertArgument(metadataEntry, 'metadataEntry', 'Metadata entry not found');
  const metadata = JSON.parse(metadataEntry.getContentAsText());
  const documents: Record<DocumentId, Uint8Array> = {};
  for (const entry of entries.filter((entry) => entry.fileName.startsWith(`${SpaceArchiveFileStructure.documents}/`))) {
    const documentId = entry.fileName
      .replace(`${SpaceArchiveFileStructure.documents}/`, '')
      .replace(/\.bin$/, '') as DocumentId;
    invariant(!documentId.includes('/'));
    documents[documentId] = entry.content ?? failedInvariant();
  }

  log('extracted space archive', { metadata, documents });
  return { metadata, documents };
};
