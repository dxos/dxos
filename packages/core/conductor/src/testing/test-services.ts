//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient } from '@effect/platform';
import { Layer, type Context, type Scope } from 'effect';

import { type EdgeClient, type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { type QueueFactory } from '@dxos/echo-db';

import { consoleLogger, noopLogger } from './logger';
import { EventLogger, GptService, FunctionCallService } from '../services';
import { DatabaseService, QueueService } from '@dxos/functions';
import { MockGpt } from '../services/testing';
import type { ComputeRequirements } from '../types';

export type TestServiceOptions = {
  gpt?: Context.Tag.Service<GptService>;
  // TODO(burdon): Create common interface for EdgeClient and EdgeHttpClient?
  edgeClient?: EdgeClient;
  edgeHttpClient?: EdgeHttpClient;
  queueFactory?: QueueFactory;
  enableLogging?: boolean;
  logger?: Context.Tag.Service<EventLogger>;
};

export const testServices = ({
  gpt = DEFAULT_MOCK_GPT,
  edgeClient,
  edgeHttpClient,
  queueFactory,
  enableLogging = false,
  logger = enableLogging ? consoleLogger : noopLogger,
}: TestServiceOptions = {}): Layer.Layer<Exclude<ComputeRequirements, Scope.Scope>> => {
  invariant((edgeClient != null) === (edgeHttpClient != null), 'specify both or none of edgeClient and edgeHttpClient');

  const logLayer = Layer.succeed(EventLogger, logger);
  const edgeClientLayer =
    queueFactory != null
      ? Layer.succeed(QueueService, { queues: queueFactory, contextQueue: undefined })
      : QueueService.notAvailable;

  const gptLayer = Layer.succeed(GptService, gpt);
  const databaseLayer = DatabaseService.notAvailable;
  const functionCallServiceLayer = Layer.succeed(FunctionCallService, FunctionCallService.mock());
  return Layer.mergeAll(
    logLayer,
    edgeClientLayer,
    gptLayer,
    databaseLayer,
    FetchHttpClient.layer,
    functionCallServiceLayer,
  );
};

const DEFAULT_MOCK_GPT = new MockGpt({
  responses: { default: 'This is a mock response that simulates a GPT-like output.' },
});
