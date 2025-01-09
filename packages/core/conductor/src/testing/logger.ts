import { Effect, type Context } from 'effect';
import type { EventLogger } from '../services/event-logger';
import type { ComputeEvent } from '../services/event-logger';

export const noopLogger: Context.Tag.Service<EventLogger> = {
  log: () => Effect.succeed(undefined),
  nodeId: undefined,
};

export const consoleLogger: Context.Tag.Service<EventLogger> = {
  log: (event: ComputeEvent) => {
    console.log(event);
  },
  nodeId: undefined,
};
