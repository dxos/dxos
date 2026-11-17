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
  /** Documents asked for whose latest change the host has not acknowledged yet: to be exported once it has. */
  pending: string[];
};
