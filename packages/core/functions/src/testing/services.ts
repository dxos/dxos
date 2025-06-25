//
// Copyright 2025 DXOS.org
//

import { type Context } from 'effect';

import type { AiServiceClient } from '@dxos/ai';
import type { QueueFactory } from '@dxos/echo-db';

import { consoleLogger, noopLogger } from './logger';
import { AiService, QueueService, ServiceContainer } from '../services';
import type { EventLogger } from '../services/event-logger';

export type TestServiceOptions = {
  ai?: AiServiceClient;
  queueFactory?: QueueFactory;
  enableLogging?: boolean;
  logger?: Context.Tag.Service<EventLogger>;
};

export const createTestServices = ({
  ai,
  queueFactory,
  enableLogging = false,
  logger = enableLogging ? consoleLogger : noopLogger,
}: TestServiceOptions = {}): ServiceContainer => {
  return new ServiceContainer().setServices({
    ai: ai != null ? AiService.make(ai) : undefined,
    eventLogger: logger,
    queues: queueFactory != null ? QueueService.make(queueFactory, undefined) : undefined,
  });
};
