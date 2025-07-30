//
// Copyright 2025 DXOS.org
//

import { type Context } from 'effect';

import { AiService, type AiServiceClient, type AiServiceEdgeClientOptions, EdgeAiServiceClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT, createTestAiServiceClient } from '@dxos/ai/testing';
import type { Space } from '@dxos/client/echo';
import type { EchoDatabase, QueueFactory } from '@dxos/echo-db';
import { assertArgument } from '@dxos/invariant';

import { consoleLogger, noopLogger } from './logger';
import {
  ConfiguredCredentialsService,
  type CredentialsService,
  DatabaseService,
  type EventLogger,
  QueueService,
  ServiceContainer,
  type ServiceCredential,
  type TracingService,
} from '../services';

// TODO(burdon): Factor out.
export type OneOf<T> = {
  [K in keyof T]: { [P in K]: T[P] } & { [P in Exclude<keyof T, K>]?: never };
}[keyof T];

export type AiServiceProvider = 'dev' | 'edge' | 'ollama' | 'lmstudio';

export type TestServiceOptions = {
  /**
   * AI service configuration.
   */
  ai?: any;

  /**
   * Credentials service configuration.
   */
  credentials?: OneOf<{
    /**
     * Predefined credentials list.
     */
    services?: ServiceCredential[];

    /**
     * Custom credentials service.
     */
    service?: Context.Tag.Service<CredentialsService>;
  }>;

  /**
   * Database configuration.
   */
  db?: EchoDatabase;

  /**
   * Gets database and queue services from the space.
   * Exclusive with: `db`, `queues`
   */
  space?: Space;

  /**
   * Logging configuration.
   */
  logging?: {
    enabled?: boolean;
    logger?: Context.Tag.Service<EventLogger>;
  };

  /**
   * Queue service configuration.
   */
  queues?: QueueFactory;

  tracing?: {
    service?: Context.Tag.Service<TracingService>;
  };
};

/**
 * @deprecated
 */
export const createTestServices = ({
  ai,
  credentials,
  db,
  logging,
  queues,
  space,
  tracing,
}: TestServiceOptions = {}): ServiceContainer => {
  assertArgument(!(!!space && (!!db || !!queues)), 'space can be provided only if db and queues are not');

  return new ServiceContainer().setServices({
    // ai: createAiService(ai),
    credentials: createCredentialsService(credentials),
    database: space || db ? DatabaseService.make(space?.db || db!) : undefined,
    eventLogger: (logging?.logger ?? logging?.enabled) ? consoleLogger : noopLogger,
    queues: space || queues ? QueueService.make(space?.queues || queues!, undefined) : undefined,
    tracing: tracing?.service,
  });
};

const createCredentialsService = (
  credentials: TestServiceOptions['credentials'] | undefined,
): Context.Tag.Service<CredentialsService> | undefined => {
  if (credentials?.services) {
    return new ConfiguredCredentialsService(credentials.services);
  }

  if (credentials?.service) {
    return credentials.service;
  }
};
