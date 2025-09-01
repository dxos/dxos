//
// Copyright 2025 DXOS.org
//

import { type AiTool } from '@effect/ai';
import { Cause, Effect, Exit, Fiber, type Layer } from 'effect';

import { type AiModelNotAvailableError } from '@dxos/ai';
import { runAndForwardErrors, throwCause } from '@dxos/effect';
import { log } from '@dxos/log';

import { type AiSession, type AiSessionRunEffect, type AiSessionRunRequirements } from '../session';

/**
 * Request handle.
 */
export class AiConversationRequest<Tools extends AiTool.Any> {
  private _fiber?: Fiber.Fiber<void, any>;

  constructor(
    private readonly _request: AiSessionRunEffect<Tools>,
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

      //
      const exit = await this._fiber.pipe(Fiber.join, Effect.runPromiseExit);
      if (!Exit.isSuccess(exit) && !Cause.isInterruptedOnly(exit.cause)) {
        throwCause(exit.cause);
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
