import * as SqlError from '@effect/sql/SqlError';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

export interface Service {
  export: Effect.Effect<Uint8Array, SqlError.SqlError>;
}

export class SqlExport extends Context.Tag('@dxos/sql-sqlite/SqlExport')<SqlExport, Service>() {}
