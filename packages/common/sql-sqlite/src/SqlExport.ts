//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as SqlError from '@effect/sql/SqlError';
import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

export interface Service {
  export: Effect.Effect<Uint8Array, SqlError.SqlError>;
}

export class SqlExport extends Context.Service<SqlExport, Service>()('@dxos/sql-sqlite/SqlExport') {}
