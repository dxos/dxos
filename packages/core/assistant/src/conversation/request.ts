//
// Copyright 2025 DXOS.org
//

import { type AiTool } from '@effect/ai';
import { Cause, Effect, Exit, Fiber, type Layer } from 'effect';

import { type AiModelNotAvailableError } from '@dxos/ai';
import { runAndForwardErrors, throwCause } from '@dxos/effect';
import { log } from '@dxos/log';
import { type DataType } from '@dxos/schema';

import { type AiSession, type AiSessionRunError, type AiSessionRunRequirements } from '../session';

/**
 * Request handle.
 */
export class AiConversationRequest<Tools extends AiTool.Any> {
  // Execution fiber.
  private _fiber?: Fiber.Fiber<void, any>;

  constructor(
    private readonly _request: Effect.Effect<DataType.Message[], AiSessionRunError, AiSessionRunRequirements<Tools>>,
    private readonly _session: AiSession,
  ) {}

  get session() {
    return this._session;
  }

  /**
   * Runs the request.
   */
  async run(services: Layer.Layer<AiSessionRunRequirements<Tools>, AiModelNotAvailableError>) {
    try {
      this._fiber = this._request.pipe(
        Effect.provide(services),
        Effect.tapErrorCause((cause) => {
          log.error('error', { cause });
          return Effect.void;
        }),
        Effect.asVoid,
        Effect.runFork,
      );

      const response = await this._fiber.pipe(Fiber.join, Effect.runPromiseExit);
      if (!Exit.isSuccess(response) && !Cause.isInterruptedOnly(response.cause)) {
        throwCause(response.cause);
      }
    } finally {
      this._fiber = undefined;
    }
  }

  /**
   * Cancels the request.
   */
  async cancel() {
    await this._fiber?.pipe(Fiber.interrupt, runAndForwardErrors);
  }
}
