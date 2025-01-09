import { Effect, type Context } from 'effect';
import type { EventLogger } from '../event-logger';
import type { ComputeEvent } from '../event-logger';

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
