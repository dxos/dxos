import { Resource, type Context } from '@dxos/context';
import { assertArgument, assertState } from '@dxos/invariant';
import type { IdentityDid, SpaceId } from '@dxos/keys';
import { SpaceArchiveFileStructure, SpaceArchiveVersion, type SpaceArchiveMetadata } from '@dxos/protocols';
import type { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';
import type { Archive } from '@obsidize/tar-browserify';

export type SpaceArchiveBeginProps = {
  spaceId?: SpaceId;

  /**
   * DID of the identity that exported the space.
   */
  exportedBy?: IdentityDid;
};

const CURRENT_VERSION = SpaceArchiveVersion.V1;

export class SpaceArchiveWriter extends Resource {
  private _tar?: typeof import('@obsidize/tar-browserify');
  private _archive?: Archive;
  private _documentsDir?: Archive;

  private _meta?: SpaceArchiveBeginProps = undefined;
  private _currentRootUrl?: string = undefined;

  protected override async _open(ctx: Context): Promise<void> {
    this._tar = await import('@obsidize/tar-browserify');
  }

  protected override async _close(): Promise<void> {
    return Promise.resolve();
  }

  async begin(meta: SpaceArchiveBeginProps) {
    assertState(this._tar, 'Not open');
    assertState(this._meta, 'Already started');
    this._meta = meta;
    this._archive = new this._tar.Archive();
    this._documentsDir = this._archive.addDirectory(SpaceArchiveFileStructure.documents);
  }

  async setCurrentRootUrl(url: string) {
    assertArgument(url.startsWith('automerge:'), 'Invalid root URL');
    assertState(this._tar, 'Not open');
    assertState(this._meta, 'Not started');
    this._currentRootUrl = url;
  }

  async writeDocument(documentId: string, data: Uint8Array) {
    assertArgument(!documentId.startsWith('automerge:'), 'Invalid document ID');
    assertState(this._documentsDir, 'Not open');
    this._documentsDir.addBinaryFile(`${documentId}.bin`, data);

    throw new Error('Not implemented');
  }

  async finish(): Promise<SpaceArchive> {
    assertState(this._archive, 'Not open');
    assertState(this._meta, 'Not started');
    assertState(this._currentRootUrl, 'No root URL set');

    const metadata: SpaceArchiveMetadata = {
      version: CURRENT_VERSION,
      createdAt: Date.now(),
      exportedBy: this._meta.exportedBy,
      originalSpaceId: this._meta.spaceId,
      echo: {
        currentRootUrl: this._currentRootUrl,
      },
    };

    this._archive.addTextFile(SpaceArchiveFileStructure.metadata, JSON.stringify(metadata));

    const binary = this._archive.toUint8Array();

    return {
      filename: `${this._meta.spaceId}.tar`,
      contents: binary,
    };
  }
}
