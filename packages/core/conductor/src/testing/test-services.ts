//
// Copyright 2025 DXOS.org
//

import { Layer, type Context, type Scope } from 'effect';

import { consoleLogger, noopLogger } from './logger';
import type { ComputeRequirements } from '../schema';
import { EventLogger, GptService } from '../services';
import { MockGpt } from '../services/gpt/mock';

export type TestServiceOptions = {
  enableLogging?: boolean;
  logger?: Context.Tag.Service<EventLogger>;
  gpt?: Context.Tag.Service<GptService>;
};

export const testServices = ({
  enableLogging = false,
  logger = enableLogging ? consoleLogger : noopLogger,
  gpt = DEFAULT_MOCK_GPT,
}: TestServiceOptions = {}): Layer.Layer<Exclude<ComputeRequirements, Scope.Scope>> => {
  const logLayer = Layer.succeed(EventLogger, logger);
  const gptLayer = Layer.succeed(GptService, gpt);

  return Layer.mergeAll(logLayer, gptLayer);
};

const DEFAULT_MOCK_GPT = new MockGpt({
  responses: { default: 'This is a mock response that simulates a GPT-like output.' },
});
