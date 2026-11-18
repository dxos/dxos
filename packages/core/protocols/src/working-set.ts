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

/**
 * What an owner holds of a database's working set for one space: a local copy of the documents its databases read or
 * wrote, as a client's boot cache holds them.
 */
export type WorkingSet = {
  rows: WorkingSetRow[];
};

/** A database's snapshot of the documents it holds, sent to its working set as it closes or before a call. */
export type WorkingSetReport = WorkingSet & {
  /** Per document id, the heads the working set last had from this database; absent for a document it had none of. */
  base: Record<string, string[]>;
};

/**
 * A working set an owner keeps for the databases it starts, so that consecutive ones read each other's writes before
 * the index holds them.
 */
export interface WorkingSetService {
  /** The documents a database seeds itself with as it opens. */
  get(): Promise<WorkingSet>;
  /** Takes a database's snapshot; a document sent from heads other than the held ones is dropped, not overwritten. */
  put(report: WorkingSetReport): Promise<void>;
}
