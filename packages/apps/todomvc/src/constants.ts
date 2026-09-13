//
// Copyright 2022 DXOS.org
//

/** The `IdbLogStore` an e2e build writes and a failing spec reads back. */
export const LOG_STORE_DB_NAME = 'todomvc-logs';

export enum FILTER {
  ALL = 'all',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}
