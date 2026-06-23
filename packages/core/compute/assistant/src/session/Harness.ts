import { Context, type Effect, DateTime } from 'effect';

import { todo } from '@dxos/debug';
import { Filter, type Obj } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { ContentBlock, type Message } from '@dxos/types';

import type { Binder } from './AiContext';

export interface Service {
  // TODO(dmaretskyi):
  binder: Effect.Effect<Binder, NotSupportedError>;
  history: Effect.Effect<Message.Message[], NotSupportedError>;
  enqueueMessage(options: EnqueueMessageOptions): Effect.Effect<void, NotSupportedError>;
  setAlarm(options: SetAlarmOptions): Effect.Effect<void, NotSupportedError>;
}

/**
 * Provides access to the controlling harness for tools and operations that are executed by the agent.
 *
 * Replaces AiContextService and AiSessionService.
 */
export class HarnessService extends Context.Tag('@dxos/assistant/HarnessService')<HarnessService, Service>() {}

/**
 * Acess current context binder.
 */
export const binder: Effect.Effect<Binder, NotSupportedError, HarnessService> = todo();

/**
 * Query the context using a filter.
 */
export const queryContext = <T extends Obj.Unknown>(
  filter: Filter.Filter<T>,
): Effect.Effect<T[], NotSupportedError, HarnessService> => todo();

interface EnqueueMessageOptions {
  content: ContentBlock.Any[];

  // TODO(dmaretskyi): Order: 'first' | 'last'
}

/**
 * Query the session history.
 */
export const history: Effect.Effect<Message.Message[], NotSupportedError, HarnessService> = todo();

/**
 * Enqueue a message to the harness.
 */
export const enqueueMessage = (
  options: EnqueueMessageOptions,
): Effect.Effect<void, NotSupportedError, HarnessService> => todo();

interface SetAlarmOptions {
  at: DateTime.DateTime;
  /**
   * Message to send when the alarm fires.
   */
  message: string | null;
}

export const setAlarm = (options: SetAlarmOptions): Effect.Effect<void, NotSupportedError, HarnessService> => todo();

export class NotSupportedError extends BaseError.extend('NotSupportedError', 'Operation not supported') {}
