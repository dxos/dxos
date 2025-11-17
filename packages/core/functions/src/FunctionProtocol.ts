//
// Copyright 2025 DXOS.org
//

import type { JsonSchemaType } from '@dxos/echo/internal';
import type * as QueryProto from '@dxos/protocols/proto/dxos/echo/query';
import type * as DataProto from '@dxos/protocols/proto/dxos/echo/service';

//
// Function protocol definition
//

// - All types must be trivially serializable - no class instances.
// - Cannot use effect.
// - Protobuf service definitions are allowed (Q: What about PublicKey, Timeframe, etc.).
// - Breaking changes in this interface should be carefully considered.

// TODO(dmaretskyi): Consider moving this to protocols.

/**
 * Function implementation.
 * This is a contract between the user-defined function and the runtime.
 */
export interface Func {
  readonly meta: Meta;
  readonly handler: Handler;
}

/**
 * Function metadata.
 */
export interface Meta {
  readonly key: string;
  name?: string;
  description?: string;
  /**
   * Required services.
   */
  readonly services: readonly string[];
  readonly inputSchema: JsonSchemaType;
  readonly outputSchema?: JsonSchemaType;
}

/**
 * Function handler.
 * Executed by the runtime
 */
export type Handler = (opts: { data: unknown; context: Context }) => Promise<unknown>;

/**
 * Function context.
 */
export interface Context {
  queryService: QueryProto.QueryService;
  dataService: DataProto.DataService;
}
