//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient } from '@effect/platform';
import { Layer, type Context, type Scope } from 'effect';

import { type EdgeClient, type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';

import { consoleLogger, noopLogger } from './logger';
import { EventLogger, GptService, QueueService, FunctionCallService } from '../services';
import { DatabaseService } from '@dxos/functions';
import { MockGpt } from '../services/testing';
import type { ComputeRequirements } from '../types';
import type { EchoDatabase } from '@dxos/echo-db';

export type TestServiceOptions = {
  gpt?: Context.Tag.Service<GptService>;
  // TODO(burdon): Create common interface for EdgeClient and EdgeHttpClient?
  edgeClient?: EdgeClient;
  edgeHttpClient?: EdgeHttpClient;
  enableLogging?: boolean;
  logger?: Context.Tag.Service<EventLogger>;
};

export const testServices = ({
  gpt = DEFAULT_MOCK_GPT,
  edgeClient,
  edgeHttpClient,
  enableLogging = false,
  logger = enableLogging ? consoleLogger : noopLogger,
}: TestServiceOptions = {}): Layer.Layer<Exclude<ComputeRequirements, Scope.Scope>> => {
  invariant((edgeClient != null) === (edgeHttpClient != null), 'specify both or none of edgeClient and edgeHttpClient');

  const logLayer = Layer.succeed(EventLogger, logger);
  const edgeClientLayer =
    edgeClient != null && edgeHttpClient != null ? QueueService.fromClient(edgeHttpClient) : QueueService.notAvailable;
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
