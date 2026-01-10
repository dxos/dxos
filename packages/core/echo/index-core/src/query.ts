//
// Copyright 2026 DXOS.org
//

/**
 * Unified query type for Indexer.execQuery routing.
 * Only one of the query types should be set.
 */
export interface IndexQuery {
  /**
   * Full-text search query.
   */
  text?: {
    query: string;
    limit?: number;
  };

  /**
   * Type-based query (via ObjectMetaIndex).
   */
  type?: {
    spaceId: string;
    typeDxn: string;
  };

  /**
   * Reverse reference lookup.
   */
  reverseRef?: {
    targetDxn: string;
  };
}

/**
 * Unified result type for Indexer.execQuery.
 * Contains recordId for joining back to ObjectMetaIndex.
 */
export interface QueryResult {
  /**
   * Record ID from ObjectMetaIndex.
   * Used for joining results across indexes.
   */
  recordId: number;

  /**
   * Full-text search: JSON snapshot of the object.
   */
  snapshot?: string;

  /**
   * Type query: object ID.
   */
  objectId?: string;

  /**
   * Type query: space ID.
   */
  spaceId?: string;

  /**
   * ReverseRef query: property path where reference was found.
   */
  propPath?: string;

  /**
   * ReverseRef query: target DXN being referenced.
   */
  targetDxn?: string;
}
