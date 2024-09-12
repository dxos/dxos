export interface UpdateOperation {
  /**
   * Sets fields.
   */
  [key: string]: any;
}

export interface InsertData {
  __typename?: string;

  /**
   * Data to insert.
   */
  [key: string]: any;
}

export type InsertBatch = InsertData[];
