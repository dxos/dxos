import type { DocumentId } from '@dxos/automerge/automerge-repo';
import { assertArgument, failedInvariant, invariant } from '@dxos/invariant';
import { SpaceArchiveFileStructure, type SpaceArchiveMetadata } from '@dxos/protocols';
import type { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

export type ExtractedSpaceArchive = {
  metadata: SpaceArchiveMetadata;
  documents: Record<DocumentId, Uint8Array>;
};

export async function extractSpaceArchive(archive: SpaceArchive): Promise<ExtractedSpaceArchive> {
  const { Archive } = await import('@obsidize/tar-browserify');
  const { entries } = await Archive.extract(archive.contents);
  const metadataEntry = entries.find((entry) => entry.fileName === SpaceArchiveFileStructure.metadata);
  assertArgument(metadataEntry, 'Metadata entry not found');
  const metadata = JSON.parse(metadataEntry.getContentAsText());
  const documents: Record<DocumentId, Uint8Array> = {};
  for (const entry of entries.filter((entry) => entry.fileName.startsWith(`${SpaceArchiveFileStructure.documents}/`))) {
    const documentId = entry.fileName.replace(`${SpaceArchiveFileStructure.documents}/`, '') as DocumentId;
    invariant(!documentId.includes('/'));
    documents[documentId] = entry.content ?? failedInvariant();
  }
  return { metadata, documents };
}
