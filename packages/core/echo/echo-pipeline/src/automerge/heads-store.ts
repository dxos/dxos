//
// Copyright 2024 DXOS.org
//

import type { Heads } from '@automerge/automerge';
import type { DocumentId } from '@automerge/automerge-repo';

import { headsEncoding } from '@dxos/indexing';
import type { BatchLevel, SublevelDB } from '@dxos/kv-store';

export type HeadsStoreProps = {
  db: SublevelDB;
};

export class HeadsStore {
  private readonly _db: SublevelDB;

  constructor({ db }: HeadsStoreProps) {
    this._db = db;
  }

  setHeads(documentId: DocumentId, heads: Heads, batch: BatchLevel): void {
    batch.put<DocumentId, Heads>(documentId, heads, {
      sublevel: this._db,
      keyEncoding: 'utf8',
      valueEncoding: headsEncoding,
    });
  }

  // TODO(dmaretskyi): Make batched.
  async getHeads(documentIds: DocumentId[]): Promise<Array<Heads | undefined>> {
    return this._db.getMany<DocumentId, Heads>(documentIds, {
      keyEncoding: 'utf8',
      valueEncoding: headsEncoding,
    });
  }
}
