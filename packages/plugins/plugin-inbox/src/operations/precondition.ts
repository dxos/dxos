//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';

import { isAiUnavailableCause } from './extractor/ai-gate.ts';

/** Reported for either AI flavour, so the two are one condition from the user's point of view. */
const AI_UNAVAILABLE = 'ai unavailable (assistant not ready)';

/**
 * The service tag named by a `ServiceNotAvailableError`, or `undefined` for any other error.
 *
 * Matched structurally (`context.service`) with a message fallback rather than by class: the error is
 * flattened to a plain object as it crosses the operation-invocation boundary, so the constructor is
 * gone by the time a cascade sees it. Same reason `ai-gate.ts` is written this way.
 */
const unavailableService = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const context = (error as { context?: { service?: unknown } | null }).context;
  if (context != null && typeof context === 'object' && typeof context.service === 'string') {
    return context.service;
  }

  const message = (error as { message?: unknown }).message;
  // The tag holds no whitespace or colons, so this stops before the rendered `: {"service":…}` suffix.
  return typeof message === 'string' ? /Service not available: ([^\s:]+)/.exec(message)?.[1] : undefined;
};

/**
 * Why a stage could not run, or `undefined` if it genuinely failed — the distinction the cascade turns
 * into `skipped` versus `failed`.
 *
 * A service the host app never contributed is a precondition, not a fault. The operation runtime
 * resolves a stage's declared `services` eagerly at spawn time, so an uninstalled plugin surfaces as a
 * `ServiceNotAvailableError` before the handler runs. Classifying that as a failure aborts the whole
 * cascade (`continueOnError` is off, because a later tier consumes the earlier one) and strands the
 * deterministic work behind it — a red meter for a mailbox with nothing wrong with it.
 *
 * Deliberately uniform over the tag rather than per-stage: the set of soft preconditions is not a
 * property of the stage, it is "whatever this deployment did not contribute". `Database` and `Trace`
 * cannot be missing here — the cascade could not have spawned without them — so nothing real is
 * swallowed, and the tag is named in the reason either way.
 */
export const unmetPrecondition = (cause: Cause.Cause<unknown>): string | undefined => {
  if (isAiUnavailableCause(cause)) {
    return AI_UNAVAILABLE;
  }

  const service = unavailableService(Cause.squash(cause));
  if (service) {
    return `${service} unavailable`;
  }

  // A defect crossing the process boundary can arrive with only its printed form intact.
  const rendered = /Service not available: ([^\s:]+)/.exec(Cause.pretty(cause))?.[1];
  return rendered ? `${rendered} unavailable` : undefined;
};
