//
// Copyright 2026 DXOS.org
//

import { type WorkingSetRow } from '@dxos/protocols';

export type ExportWorkingSetOptions = {
  /** Upper bound on the summed {@link WorkingSetRow.bytes}; documents that do not fit are left out. */
  maxBytes: number;
};

/** The rows of documents whose held state moved, for a working set kept current as a client writes and loads. */
export type WorkingSetChanges = {
  rows: WorkingSetRow[];
  /** The space root's document id, when the root is among {@link rows}. */
  root?: string;
  /** Objects the client wrote in these documents, once the host holds the write, that the index may not hold yet. */
  written: string[];
  /** Documents asked for whose latest change the host has not acknowledged yet: to be exported once it has. */
  pending: string[];
};
