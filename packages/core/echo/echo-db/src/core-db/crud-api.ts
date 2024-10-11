//
// Copyright 2024 DXOS.org
//

import type { AnyObjectData } from '@dxos/echo-schema';
import type { PropertyFilter, QueryFn } from '../query';
import type { FlushOptions } from './core-database';

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

export interface CrudDatabase {
  query: QueryFn;

  update(filter: PropertyFilter, operation: UpdateOperation): Promise<void>;

  insert(data: InsertData): Promise<AnyObjectData>;
  insert(data: InsertBatch): Promise<AnyObjectData[]>;

  flush(opts?: FlushOptions): Promise<void>;
}
