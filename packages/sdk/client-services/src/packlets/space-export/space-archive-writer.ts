//
// Copyright 2025 DXOS.org
//

import type * as tar from '@obsidize/tar-browserify';

import { type Context, Resource } from '@dxos/context';
import { assertArgument, assertState } from '@dxos/invariant';
import type { IdentityDid, SpaceId } from '@dxos/keys';
import { SpaceArchiveFileStructure, type SpaceArchiveMetadata, SpaceArchiveVersion } from '@dxos/protocols';
import type { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

export type SpaceArchiveBeginProps = {
  spaceId?: SpaceId;

  /**
   * DID of the identity that exported the space.
   */
  exportedBy?: IdentityDid;
};

const CURRENT_VERSION = SpaceArchiveVersion.V1;

export class SpaceArchiveWriter extends Resource {
  private _tar?: typeof tar;
  private _archive?: tar.Archive;

  private _meta?: SpaceArchiveBeginProps = undefined;
  private _currentRootUrl?: string = undefined;

  protected override async _open(ctx: Context): Promise<void> {
    this._tar = await import('@obsidize/tar-browserify');
  }

  protected override async _close(): Promise<void> {
    return Promise.resolve();
  }

  async begin(meta: SpaceArchiveBeginProps): Promise<void> {
    assertState(this._tar, 'Not open');
    assertState(!this._meta, 'Already started');
    this._meta = meta;
    this._archive = new this._tar.Archive();
  }

  async setCurrentRootUrl(url: string): Promise<void> {
    assertArgument(url.startsWith('automerge:'), 'url', 'Invalid root URL');
    assertState(this._tar, 'Not open');
    assertState(this._meta, 'Not started');
    this._currentRootUrl = url;
  }

  async writeDocument(documentId: string, data: Uint8Array): Promise<void> {
    assertArgument(!documentId.startsWith('automerge:'), 'documentId', 'Invalid document ID');
    assertState(this._archive, 'Not open');
    this._archive.addBinaryFile(`${SpaceArchiveFileStructure.documents}/${documentId}.bin`, data);
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
      filename: `${new Date().toISOString()}-${this._meta.spaceId}.tar`,
      contents: binary,
    };
  }
}
