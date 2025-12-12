//
// Copyright 2025 DXOS.org
//

import { type SpaceId } from '@dxos/keys';
import type * as QueryProto from '@dxos/protocols/proto/dxos/echo/query';
import type * as DataProto from '@dxos/protocols/proto/dxos/echo/service';

import { type EdgeFunctionEnv } from './edge';
import { type QueueService } from './queue';

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
  /**
   * JSON schema format
   */
  readonly inputSchema: unknown;
  /**
   * JSON schema format.
   */
  readonly outputSchema?: unknown;
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
  services: {
    /**
     * Query service.
     * Available if the function is invoked in context of a space.
     */
    queryService?: QueryProto.QueryService;

    /**
     * Data service.
     * Available if the function is invoked in context of a space.
     */
    dataService?: DataProto.DataService;

    /**
     * Queue service.
     * Available if the function is invoked in context of a space.
     */
    queueService?: QueueService;

    /**
     * Functions service.
     * Available if the function is invoked in context of a space.
     */
    functionsService?: EdgeFunctionEnv.FunctionService;
  };

  /**
   * That space that the function is invoked in context of.
   */
  spaceId?: SpaceId;

  /**
   * Hex-encoded space key.
   * @deprecated We need to remove this but ECHO keeps dragging this in.
   */
  spaceKey?: string;

  /**
   * Automerge URL of the space-root document.
   */
  spaceRootUrl?: string;
}
