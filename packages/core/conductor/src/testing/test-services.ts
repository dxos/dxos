import { Layer, type Context } from 'effect';
import { GptService } from '../services/gpt';
import { MockGpt } from '../services/gpt/mock';
import { consoleLogger } from './logger';
import { noopLogger } from './logger';
import type { ComputeRequirements } from '../schema';
import { EventLogger } from '../services/event-logger';

export type TestServiceOptions = {
  enableLogging?: boolean;
  logger?: Context.Tag.Service<EventLogger>;
  gpt?: Context.Tag.Service<GptService>;
};

export const testServices = ({
  enableLogging = false,
  logger = enableLogging ? consoleLogger : noopLogger,
  gpt = DEFAULT_MOCK_GPT,
}: TestServiceOptions = {}): Layer.Layer<ComputeRequirements> => {
  const logLayer = Layer.succeed(EventLogger, logger);
  const gptLayer = Layer.succeed(GptService, gpt);

  return Layer.mergeAll(logLayer, gptLayer);
};

const DEFAULT_MOCK_GPT = new MockGpt({
  responses: { default: 'This is a mock response that simulates a GPT-like output.' },
});
