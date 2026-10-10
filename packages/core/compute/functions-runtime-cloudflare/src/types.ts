//
// Copyright 2024 DXOS.org
//

import type * as JsonSchema from '@dxos/echo/JsonSchema';

/**
 * Is used for to route the request to the metadata handler instead of the main handler.
 */
export const FUNCTION_ROUTE_HEADER = 'X-DXOS-Function-Route';

export enum FunctionRouteValue {
  Meta = 'meta',
}

export type FunctionMetadata = {
  /**
   * FQN.
   */
  key: string;
  /**
   * Human-readable name.
   */
  name?: string;

  /**
   * Description.
   */
  description?: string;

  /**
   * Input schema.
   */
  inputSchema?: JsonSchema.JsonSchema;

  /**
   * Output schema.
   */
  outputSchema?: JsonSchema.JsonSchema;
};
