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
 * What an owner holds of a database's working set for one space: the documents it recently read or wrote, and the
 * objects it wrote that the index may not hold yet.
 */
export type WorkingSet = {
  rows: WorkingSetRow[];
  /** Ids of objects the owner wrote; a database counts them among its local writes the index has not seen. */
  unindexed: string[];
};

/** What a database sends its working set as the host stores its writes and it loads documents. */
export type WorkingSetReport = WorkingSet & {
  /** Per document id, the heads the working set last had from this database; absent for a document it had none of. */
  base: Record<string, string[]>;
  /** The space root's document id, when the root is among the rows. */
  root?: string;
};

/**
 * A working set an owner keeps for the databases it starts, so that consecutive ones read each other's writes before
 * the index holds them.
 */
export interface WorkingSetService {
  get(): Promise<WorkingSet>;
  put(report: WorkingSetReport): Promise<void>;
}
