//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';

import { AiModelNotAvailableError, AiService } from '@dxos/ai';

/**
 * Recognise a failure caused by `@dxos/ai/AiService` being absent from the process-manager
 * `LayerStack`. The extract operations declare `AiService` in their `services`, so the process
 * invoker resolves it eagerly at spawn time; if the assistant plugin's `AiService` `LayerSpec`
 * was not contributed before the runtime built its stack, the spawn dies with a
 * `ServiceNotAvailableError` naming the tag — before the handler ever runs.
 *
 * The check is intentionally lenient: it matches the structured `context.service` field
 * (`ServiceNotAvailableError`) and falls back to the formatted message, since the structured error
 * can be flattened to a plain `Error` as it crosses the operation-invocation boundary.
 */
export const isAiServiceUnavailable = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const key = AiService.key;

  const context = (error as { context?: { service?: unknown } | null }).context;
  if (context != null && typeof context === 'object' && context.service === key) {
    return true;
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && message.includes(key);
};

/**
 * Recognise "no resolver claims this model". Distinct from {@link isAiServiceUnavailable}: the
 * `AiService` IS in the stack, but the model's resolver is not — plugin-assistant contributes the
 * Anthropic one on `AssistantEvents.Start` and only with a client, so a pipeline run before the
 * assistant is up asks for a model nobody serves.
 *
 * Matched by name (`BaseError.is` compares `error.name`) with a message fallback, since the error is
 * flattened to a plain `Error` as it crosses the operation-invocation boundary.
 */
export const isAiModelUnavailable = (error: unknown): boolean => {
  if (AiModelNotAvailableError.is(error)) {
    return true;
  }
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && message.includes(AiModelNotAvailableError.name);
};

/** Either flavour of "the assistant is not ready yet" — no service in the stack, or no model resolver. */
export const isAiUnavailable = (error: unknown): boolean =>
  isAiServiceUnavailable(error) || isAiModelUnavailable(error);

/**
 * {@link isAiUnavailable} over a `Cause`, which is how a pipeline stage's failure arrives: the AI
 * layers `orDie`, so an unavailable model is a DEFECT rather than a typed error. The rendered cause is
 * also tested, because a defect crossing the process boundary can arrive as a plain object whose only
 * surviving trace of the error type is its printed form.
 */
export const isAiUnavailableCause = (cause: Cause.Cause<unknown>): boolean => {
  if (isAiUnavailable(Cause.squash(cause))) {
    return true;
  }
  const rendered = Cause.pretty(cause);
  return rendered.includes(AiModelNotAvailableError.name) || rendered.includes(AiService.key);
};
