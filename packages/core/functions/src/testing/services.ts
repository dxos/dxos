//
// Copyright 2025 DXOS.org
//

import { type Context } from 'effect';

import {
  AiService,
  type AiServiceClient,
  type AiServiceEdgeClientOptions,
  EdgeAiServiceClient,
  ToolRegistry,
} from '@dxos/ai';
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
  ToolResolverService,
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
  ai?: OneOf<{
    /**
     * Custom AI service client.
     */
    client?: AiServiceClient;

    /**
     * Edge AI service at specified endpoint.
     */
    endpoint?: AiServiceEdgeClientOptions['endpoint'];

    /**
     * Predefined AI service configuration.
     */
    // TODO(burdon): 'dev' and 'edge' are redundant with providing an endpoint.
    provider?: AiServiceProvider;
  }>;

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

  toolResolver?: Context.Tag.Service<ToolResolverService>;
};

export const createTestServices = ({
  ai,
  credentials,
  db,
  logging,
  queues,
  space,
  tracing,
  toolResolver,
}: TestServiceOptions = {}): ServiceContainer => {
  assertArgument(!(!!space && (!!db || !!queues)), 'space can be provided only if db and queues are not');

  return new ServiceContainer().setServices({
    ai: createAiService(ai),
    credentials: createCredentialsService(credentials),
    database: space || db ? DatabaseService.make(space?.db || db!) : undefined,
    eventLogger: logging?.logger ?? logging?.enabled ? consoleLogger : noopLogger,
    queues: space || queues ? QueueService.make(space?.queues || queues!, undefined) : undefined,
    tracing: tracing?.service,
    toolResolver: toolResolver ?? ToolResolverService.make(new ToolRegistry([])),
  });
};

// TODO(burdon): Enable model configuration.
const createAiService = (ai: TestServiceOptions['ai']): Context.Tag.Service<AiService> | undefined => {
  if (ai?.client != null) {
    return AiService.make(ai.client);
  }

  if (ai?.endpoint != null) {
    return AiService.make(new EdgeAiServiceClient({ endpoint: ai.endpoint }));
  }

  switch (ai?.provider) {
    case 'dev':
      return AiService.make(
        new EdgeAiServiceClient({
          endpoint: AI_SERVICE_ENDPOINT.LOCAL,
          defaultGenerationOptions: {
            model: '@anthropic/claude-3-5-sonnet-20241022',
          },
        }),
      );

    case 'edge':
      return AiService.make(
        new EdgeAiServiceClient({
          endpoint: AI_SERVICE_ENDPOINT.REMOTE,
          defaultGenerationOptions: {
            model: '@anthropic/claude-3-5-sonnet-20241022',
          },
        }),
      );

    case 'ollama':
      return AiService.make(createTestAiServiceClient());

    case 'lmstudio':
      throw new Error('LMStudio is not supported');
  }
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
