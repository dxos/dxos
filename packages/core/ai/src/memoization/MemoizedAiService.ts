//
// Copyright 2025 DXOS.org
//

import { Effect, Layer } from 'effect';

import { TestContextService } from '@dxos/effect';

import * as AiService from '../AiService';

import * as MemoizedLanguageModel from './MemoizedLanguageModel';

export interface MemoizedAiService extends AiService.Service {}

export interface MakeOptions {
  upstream: AiService.Service;
  /**
   * Filename for memoized conversations to be stored at.
   */
  storePath: string;

  allowGeneration: boolean;
}

export const make = (options: MakeOptions): MemoizedAiService => ({
  model: (model) =>
    Layer.provide(
      MemoizedLanguageModel.layer({
        modelName: model,
        storePath: options.storePath,
        allowGeneration: options.allowGeneration,
      }),
      options.upstream.model(model),
    ),
});

/**
 * Memoizes the requests to the AI service.
 * All conversations will be saved in `<test-file>.conversations.json`.
 * Unless `ALLOW_LLM_GENERATION=1` is specified, no generation will be performed and the agent will error if it cannot find a memoized conversation with matching prompt
 * If `ALLOW_LLM_GENERATION=1` is specified, the agent will generate a response if it cannot find a memoized conversation with matching prompt.
 * Requires `TestContextService` to be provided to extract the test file path.
 *
 * @param options.storePath [default: `<test-file>.conversations.json`] - Filename for memoized conversations to be stored at.
 * @param options.allowGeneration [default: `ALLOW_LLM_GENERATION=1`] - Whether to allow generation if no memoized conversation is found.
 */
export const layerTest = (options: Partial<Omit<MakeOptions, 'upstream'>> = {}) =>
  Layer.effect(
    AiService.AiService,
    Effect.gen(function* () {
      const ctx = yield* TestContextService;
      const upstream = yield* AiService.AiService;
      return make({
        upstream,
        storePath: options.storePath ?? ctx.task.file.filepath.replace('.test.ts', '.conversations.json'),
        allowGeneration: options.allowGeneration ?? isGenerationEnabled(),
      });
    }),
  );

/**
 * @returns true if generation is enabled according to the environment variable `ALLOW_LLM_GENERATION`.
 */
export const isGenerationEnabled = () => ['1', 'true'].includes(process.env.ALLOW_LLM_GENERATION ?? '0');
