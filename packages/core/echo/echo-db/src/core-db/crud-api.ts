//
// Copyright 2024 DXOS.org
//

/** @internal */
export interface UpdateOperation {
  /**
   * Sets fields.
   */
  [key: string]: any;
}

/** @internal */
export interface InsertData {
  __typename?: string;

  /**
   * Data to insert.
   */
  [key: string]: any;
}

/** @internal */
export type InsertBatch = InsertData[];
