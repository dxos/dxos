import type { AiServiceClient } from '@dxos/ai';
import type { QueueFactory } from '@dxos/echo-db';
import { type Context } from 'effect';
import { AiService, QueueService, ServiceContainer } from '../services';
import type { EventLogger } from '../services/event-logger';
import { consoleLogger, noopLogger } from './logger';

export type TestServiceOptions = {
  ai?: AiServiceClient;
  queueFactory?: QueueFactory;
  enableLogging?: boolean;
  logger?: Context.Tag.Service<EventLogger>;
};

export const testServices = ({
  ai,
  queueFactory,
  enableLogging = false,
  logger = enableLogging ? consoleLogger : noopLogger,
}: TestServiceOptions = {}): ServiceContainer => {
  return new ServiceContainer().setServices({
    eventLogger: logger,
    queues: queueFactory != null ? QueueService.make(queueFactory, undefined) : undefined,
    ai: ai != null ? AiService.make(ai) : undefined,
  });
};
