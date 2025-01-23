//
// Copyright 2025 DXOS.org
//

import { Layer, type Context, type Scope } from 'effect';

import { type EdgeClient, type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';

import { consoleLogger, noopLogger } from './logger';
import { EventLogger, GptService, SpaceService, EdgeClientService } from '../services';
import { MockGpt } from '../services/testing';
import type { ComputeRequirements } from '../types';

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
  invariant((edgeClient != null) === (edgeHttpClient != null), 'specify one of edgeClient or edgeHttpClient');

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
