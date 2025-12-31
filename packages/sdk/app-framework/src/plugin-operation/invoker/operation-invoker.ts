//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as PubSub from 'effect/PubSub';

import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';
import type { OperationDefinition, OperationHandler } from '@dxos/operation';
import { byPosition } from '@dxos/util';

import { NoHandlerError } from './errors';
import type { OperationResolver } from './operation-resolver';

/**
 * Invocation event emitted after each operation.
 */
export type InvocationEvent<I = any, O = any> = {
  operation: OperationDefinition<I, O>;
  input: I;
  output: O;
  timestamp: number;
};

//
// Public Interface
//

/**
 * OperationInvoker interface - resolves and executes operations.
 */
export interface OperationInvoker {
  invoke: <I, O>(op: OperationDefinition<I, O>, input: I) => Effect.Effect<O, Error>;
  invokePromise: <I, O>(op: OperationDefinition<I, O>, input: I) => Promise<{ data?: O; error?: Error }>;
  /** @internal */
  _invokeCore: <I, O>(op: OperationDefinition<I, O>, input: I) => Effect.Effect<O, Error>;
  /** Effect stream of invocation events. */
  invocations: PubSub.PubSub<InvocationEvent>;
}

//
// Internal Implementation
//

class OperationInvokerImpl implements OperationInvoker {
  private readonly _pubsub: PubSub.PubSub<InvocationEvent>;
  private readonly _getHandlers: () => OperationResolver[];

  constructor(getHandlers: () => OperationResolver[]) {
    this._getHandlers = getHandlers;
    this._pubsub = Effect.runSync(PubSub.unbounded<InvocationEvent>());
  }

  get invocations(): PubSub.PubSub<InvocationEvent> {
    return this._pubsub;
  }

  invoke<I, O>(op: OperationDefinition<I, O>, input: I): Effect.Effect<O, Error> {
    return Effect.gen(this, function* () {
      const output = yield* this._invokeCore(op, input);

      // Publish event after successful invocation.
      yield* PubSub.publish(this._pubsub, {
        operation: op,
        input,
        output,
        timestamp: Date.now(),
      });

      return output;
    });
  }

  async invokePromise<I, O>(op: OperationDefinition<I, O>, input: I): Promise<{ data?: O; error?: Error }> {
    return runAndForwardErrors(this.invoke(op, input))
      .then((data) => ({ data }))
      .catch((error) => {
        log.catch(error);
        return { error };
      });
  }

  private _resolveHandler(
    operation: OperationDefinition<any, any>,
    input: any,
  ): OperationHandler<any, any> | undefined {
    const candidates = this._getHandlers()
      .filter((reg) => reg.operation.meta.key === operation.meta.key)
      .filter((reg) => !reg.filter || reg.filter(input))
      .toSorted(byPosition);

    if (candidates.length === 0) {
      return undefined;
    }

    return candidates[0].handler;
  }

  /** @internal */
  _invokeCore<I, O>(op: OperationDefinition<I, O>, input: I): Effect.Effect<O, Error> {
    return Effect.gen(this, function* () {
      const handler = this._resolveHandler(op, input);
      if (!handler) {
        return yield* Effect.fail(new NoHandlerError(op.meta.key));
      }

      log('invoking operation', { key: op.meta.key, input });
      // Handler may have different error/requirements types, so we cast the result.
      const output = yield* handler(input) as Effect.Effect<O, Error>;
      log('operation completed', { key: op.meta.key, output });

      return output;
    });
  }
}

//
// Factory
//

/**
 * Creates an OperationInvoker that resolves handlers and invokes operations.
 * Emits invocation events to subscribers after successful invocations.
 */
export const make = (getHandlers: () => OperationResolver[]): OperationInvoker => {
  return new OperationInvokerImpl(getHandlers);
};
