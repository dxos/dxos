//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';
import type * as SqlError from 'effect/unstable/sql/SqlError';

export interface Service {
  export: Effect.Effect<Uint8Array, SqlError.SqlError>;
}

export class SqlExport extends Context.Service<SqlExport, Service>()('@dxos/sql-sqlite/SqlExport') {}
