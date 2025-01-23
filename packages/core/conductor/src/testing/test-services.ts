//
// Copyright 2025 DXOS.org
//

import { Layer, type Context, type Scope } from 'effect';

import { consoleLogger, noopLogger } from './logger';
import { EventLogger, GptService, SpaceService } from '../services';
import { MockGpt } from '../services/gpt/mock';
import type { ComputeRequirements } from '../types';
import { EdgeClientService } from '../services/edge-client-service';
import { EdgeClient, EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';

export type TestServiceOptions = {
  enableLogging?: boolean;
  edgeClient?: EdgeClient;
  edgeHttpClient?: EdgeHttpClient;
  logger?: Context.Tag.Service<EventLogger>;
  gpt?: Context.Tag.Service<GptService>;
};

export const testServices = ({
  enableLogging = false,
  logger = enableLogging ? consoleLogger : noopLogger,
  edgeClient,
  edgeHttpClient,
  gpt = DEFAULT_MOCK_GPT,
}: TestServiceOptions = {}): Layer.Layer<Exclude<ComputeRequirements, Scope.Scope>> => {
  invariant((edgeClient != null) === (edgeHttpClient != null));

  const logLayer = Layer.succeed(EventLogger, logger);
  const edgeClientLayer =
    edgeClient != null && edgeHttpClient != null
      ? EdgeClientService.fromClient(edgeClient, edgeHttpClient)
      : EdgeClientService.notAvailable;
  const gptLayer = Layer.succeed(GptService, gpt);
  const spaceLayer = SpaceService.empty;
  return Layer.mergeAll(logLayer, edgeClientLayer, gptLayer, spaceLayer);
};

const DEFAULT_MOCK_GPT = new MockGpt({
  responses: { default: 'This is a mock response that simulates a GPT-like output.' },
});
