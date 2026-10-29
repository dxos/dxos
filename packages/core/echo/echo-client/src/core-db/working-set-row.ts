//
// Copyright 2026 DXOS.org
//

/**
 * One Automerge document of a database's working set, persisted outside the host so a later session can
 * show and edit it before the host is reachable. The fields mirror a document row of
 * `QueryService.QueryResult`: JSON to show the object without loading Automerge, and the stored changes
 * to load it when it is first written.
 */
export type WorkingSetRow = {
  documentId: string;
  /** Heads the host holds {@link bytes} at; the bytes may be ahead of them, never behind. */
  heads: string[];
  /** The document's stored changes, as `Automerge.save` or the host's stored chunks. */
  bytes: Uint8Array;
  /** Set with {@link objectJson} for a document that holds exactly one object. */
  objectId?: string;
  /** The object in the ECHO JSON object format, read at {@link heads}. */
  objectJson?: string;
  createdAt?: number;
  updatedAt?: number;
  /** Set on the space root's row when it holds no inline objects: the directory as JSON, read at {@link heads}. */
  directoryJson?: string;
};

export type ExportWorkingSetOptions = {
  /** Upper bound on the summed {@link WorkingSetRow.bytes}; documents that do not fit are left out. */
  maxBytes: number;
};
