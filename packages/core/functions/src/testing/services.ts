//
// Copyright 2025 DXOS.org
//

import { type Context } from 'effect';

import { EdgeAiServiceClient, type AiServiceClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT, createTestOllamaClient } from '@dxos/ai/testing';
import type { Space } from '@dxos/client/echo';
import type { EchoDatabase, QueueFactory } from '@dxos/echo-db';
import { assertArgument } from '@dxos/invariant';

import { consoleLogger, noopLogger } from './logger';
import {
  AiService,
  ConfiguredCredentialsService,
  type CredentialsService,
  DatabaseService,
  QueueService,
  ServiceContainer,
  type ServiceCredential,
  type TracingService,
} from '../services';
import type { EventLogger } from '../services/event-logger';

export type AiServiceProvider = 'dev' | 'edge' | 'ollama' | 'lmstudio';

export type TestServiceOptions = {
  /**
   * AI service configuration.
   */
  ai?: {
    /**
     * Predefined AI service configuration.
     * Exclusive with: `endpoint`, `client`
     */
    provider?: AiServiceProvider;

    /**
     * Edge AI service at specified endpoint.
     * Exclusive with: `provider`, `client`
     */
    edgeEndpoint?: string;

    /**
     * Custom AI service client.
     * Exclusive with: `location`, `edgeEndpoint`
     */
    client?: AiServiceClient;
  };

  /**
   * Credentials service configuration.
   */
  credentials?: {
    /**
     * Predefined credentials list.
     * Exclusive with: `service`
     */
    credentials?: ServiceCredential[];

    /**
     * Custom credentials service.
     * Exclusive with: `credentials`
     */
    service?: Context.Tag.Service<CredentialsService>;
  };

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
    ai: createAiService(ai),
    database: space || db ? DatabaseService.make(space?.db! || db!) : undefined,
    credentials: createCredentialsService(credentials),
    eventLogger: logging?.logger ?? logging?.enabled ? consoleLogger : noopLogger,
    queues: space || queues ? QueueService.make(space?.queues! || queues!, undefined) : undefined,
    tracing: tracing?.service,
  });
};

const createAiService = (ai: TestServiceOptions['ai'] | undefined): Context.Tag.Service<AiService> | undefined => {
  if (!ai) {
    return undefined;
  }

  assertArgument(
    (ai.provider != null ? 1 : 0) + (ai.edgeEndpoint != null ? 1 : 0) + (ai.client != null ? 1 : 0) === 1,
    'only one of ai.provider, ai.edgeEndpoint, or ai.client must be specified',
  );

  switch (ai.provider) {
    case 'dev':
      return AiService.make(
        new EdgeAiServiceClient({
          endpoint: AI_SERVICE_ENDPOINT.LOCAL,
          // TODO(dmaretskyi): Allow to be configured.
          defaultGenerationOptions: {
            model: '@anthropic/claude-3-5-sonnet-20241022',
          },
        }),
      );
    case 'edge':
      return AiService.make(
        new EdgeAiServiceClient({
          endpoint: AI_SERVICE_ENDPOINT.REMOTE,
          // TODO(dmaretskyi): Allow to be configured.
          defaultGenerationOptions: {
            model: '@anthropic/claude-3-5-sonnet-20241022',
          },
        }),
      );
    case 'ollama':
      return AiService.make(createTestOllamaClient());
    case 'lmstudio':
      throw new Error('LMStudio is not supported yet');
  }

  if (ai.edgeEndpoint != null) {
    return AiService.make(
      new EdgeAiServiceClient({
        endpoint: ai.edgeEndpoint,
      }),
    );
  }

  if (ai.client != null) {
    return AiService.make(ai.client);
  }

  return undefined;
};

const createCredentialsService = (
  credentials: TestServiceOptions['credentials'] | undefined,
): Context.Tag.Service<CredentialsService> | undefined => {
  if (!credentials) {
    return undefined;
  }

  assertArgument(
    (credentials.credentials != null ? 1 : 0) + (credentials.service != null ? 1 : 0) === 1,
    'only one of credentials.credentials or credentials.service must be specified',
  );

  if (credentials.credentials) {
    return new ConfiguredCredentialsService(credentials.credentials);
  }

  if (credentials.service) {
    return credentials.service;
  }

  return undefined;
};
