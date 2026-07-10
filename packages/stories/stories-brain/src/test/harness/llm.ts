//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { AiService } from '@dxos/ai';
import { DXN } from '@dxos/keys';

/**
 * Generates text from a specific model + provider, resolving the `LanguageModel` from the ambient
 * `AiService` (provided by the benchmark's preset layer). The provider is required because
 * `AiService.model` defaults to edge, which does not serve local (ollama) models. On timeout or
 * model error the effect degrades to an empty string, so a weak/slow model yields empty output
 * rather than aborting the whole run.
 */
export const generateText = (
  model: string,
  provider: DXN.DXN,
  prompt: string,
  timeout: Duration.DurationInput = '60 seconds',
): Effect.Effect<string, never, AiService.AiService> =>
  Effect.gen(function* () {
    const service = yield* AiService.AiService;
    return yield* LanguageModel.generateText({ prompt }).pipe(
      Effect.provide(service.model(DXN.make(model), { provider })),
      Effect.timeout(timeout),
      Effect.map((response) => response.text),
      Effect.orElse(() => Effect.succeed('')),
    );
  });

/** Extracts the first JSON object from model output (local models wrap JSON in prose / fences). */
export const parseJsonObject = <T>(raw: string, fallback: T): T => {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return fallback;
  }
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return fallback;
  }
};

/** Extracts the first JSON array from model output. */
export const parseJsonArray = <T>(raw: string): T[] => {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) {
    return [];
  }
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

export const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item)).filter((item) => item.length > 0) : [];
