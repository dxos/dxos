//
// Copyright 2026 DXOS.org
//

export type ExportWorkingSetOptions = {
  /** Upper bound on the summed `WorkingSetRow.bytes`; documents that do not fit are left out. */
  maxBytes: number;
};
