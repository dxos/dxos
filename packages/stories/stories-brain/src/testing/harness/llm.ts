//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';

import { AiService } from '@dxos/ai';
import { DXN } from '@dxos/keys';

// Bounded exponential backoff before degrading — absorbs transient failures (chiefly remote rate
// limits) during a long unattended run, so a 429 burst doesn't silently poison a whole tier's
// results. Permanent failures (e.g. an unresolved model) just cost three quick retries then degrade.
const RETRY = Schedule.intersect(Schedule.exponential('2 seconds'), Schedule.recurs(3));

// Per-call timeout. Must be GENEROUS: a slow model (a 30B or a reasoning model on a long prompt) that
// times out degrades to empty and scores as *inaccurate*, conflating "slow" with "bad". Give it room
// to finish — latency is measured separately, so slowness is captured honestly rather than as failure.
// `LLM_TIMEOUT` (seconds) overrides; the overnight driver raises it well above any real completion.
const DEFAULT_TIMEOUT: Duration.DurationInput = process.env.LLM_TIMEOUT
  ? `${Math.max(1, Number(process.env.LLM_TIMEOUT))} seconds`
  : '60 seconds';

/**
 * Generates text from a specific model + provider, resolving the `LanguageModel` from the ambient
 * `AiService` (provided by the benchmark's preset layer). The provider is required because
 * `AiService.model` defaults to edge, which does not serve local (ollama) models. Transient failures
 * are retried with backoff; on final timeout or model error the effect degrades to an empty string,
 * so a weak/slow model yields empty output rather than aborting the whole run.
 */
export const generateText = (
  model: string,
  provider: DXN.DXN,
  prompt: string,
  timeout: Duration.DurationInput = DEFAULT_TIMEOUT,
): Effect.Effect<string, never, AiService.AiService> =>
  Effect.gen(function* () {
    const service = yield* AiService.AiService;
    return yield* LanguageModel.generateText({ prompt }).pipe(
      Effect.provide(service.model(DXN.make(model), { provider })),
      Effect.timeout(timeout),
      Effect.retry(RETRY),
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
