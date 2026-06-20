//
// Copyright 2026 DXOS.org
//

import { AiService } from '@dxos/ai';

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

  const key = AiService.AiService.key;

  const context = (error as { context?: { service?: unknown } | null }).context;
  if (context != null && typeof context === 'object' && context.service === key) {
    return true;
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && message.includes(key);
};
