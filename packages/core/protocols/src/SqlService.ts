//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Rpc from 'effect/rpc/Rpc';
import type * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';
import * as SchemaTransformation from 'effect/SchemaTransformation';
import * as SqlError from 'effect/sql/SqlError';

/** Tagged on the wire so a bigint is not confused with a string column. */
const BigIntValue = Schema.Struct({ bigint: Schema.String }).pipe(
  Schema.decodeTo(
    Schema.BigInt,
    SchemaTransformation.transform({
      decode: ({ bigint }) => BigInt(bigint),
      encode: (value) => ({ bigint: value.toString() }),
    }),
  ),
);

/** A SQLite storage-class value. */
export const SqlValue = Schema.Union([
  Schema.Null,
  Schema.Boolean,
  Schema.Number,
  Schema.String,
  Schema.Uint8Array,
  BigIntValue,
]);
export type SqlValue = Schema.Schema.Type<typeof SqlValue>;

/** Coerces a driver value or bound parameter to a wire value; anything non-native is stringified. */
export const toSqlValue = (value: unknown): SqlValue => {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'bigint' ||
    value instanceof Uint8Array
  ) {
    return value;
  }
  return value === undefined ? null : String(value);
};

export const ExecuteRequest = Schema.Struct({
  database: Schema.String,
  sql: Schema.String,
  params: Schema.Array(SqlValue),
  /** Id from `begin`; the statement runs inside that transaction. */
  transaction: Schema.optional(Schema.String),
});
export interface ExecuteRequest extends Schema.Schema.Type<typeof ExecuteRequest> {}

export const ExecuteResponse = Schema.Struct({
  rows: Schema.Array(Schema.Record(Schema.String, SqlValue)),
});
export interface ExecuteResponse extends Schema.Schema.Type<typeof ExecuteResponse> {}

export const BeginRequest = Schema.Struct({ database: Schema.String });
export interface BeginRequest extends Schema.Schema.Type<typeof BeginRequest> {}

export const TransactionRequest = Schema.Struct({ transaction: Schema.String });
export interface TransactionRequest extends Schema.Schema.Type<typeof TransactionRequest> {}

/**
 * Effect RPC definitions for sandboxed SQLite access by operations and processes.
 * The host screens every statement; see `SqlService` in `@dxos/compute`.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('execute', {
    payload: ExecuteRequest,
    success: ExecuteResponse,
    error: SqlError.SqlError,
  }),
  Rpc.make('begin', {
    payload: BeginRequest,
    success: TransactionRequest,
    error: SqlError.SqlError,
  }),
  Rpc.make('commit', {
    payload: TransactionRequest,
    error: SqlError.SqlError,
  }),
  Rpc.make('rollback', {
    payload: TransactionRequest,
    error: SqlError.SqlError,
  }),
).prefix('SqlService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

/**
 * Effect service tag for the `SqlService` RPC handlers.
 */
export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/SqlService') {}
