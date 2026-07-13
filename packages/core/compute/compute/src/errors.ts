//
// Copyright 2025 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';


// Errors from @dxos/operation.

export class InvokerNotInitializedError extends BaseError.extend(
  'InvokerNotInitializedError',
  'Invoker not initialized',
) {
  constructor() {
    super();
  }
}

export class NoHandlerError extends BaseError.extend('NoHandlerError', 'No handler found for operation. ') {
  constructor(operationKey: string) {
    super({ context: { operationKey } });
  }
}

// Errors from @dxos/functions.

export class ServiceNotAvailableError extends BaseError.extend('ServiceNotAvailable', 'Service not available') {
  constructor(service: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { service }, message: `Service not available: ${service}`, ...options });
  }
}

export class FunctionNotFoundError extends BaseError.extend('FunctionNotFound', 'Function not found') {
  constructor(functionKey: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { function: functionKey }, ...options });
  }
}

export class FunctionError extends BaseError.extend('FunctionError', 'Function invocation error') {}

export class InvalidOperationInputError extends BaseError.extend(
  'InvalidOperationInput',
  'Operation input did not match schema',
) {}

export class InvalidOperationOutputError extends BaseError.extend(
  'InvalidOperationOutput',
  'Operation output did not match schema',
) {}

export class TriggerStateNotFoundError extends BaseError.extend('TriggerStateNotFound', 'Trigger state not found') {}

/**
 * Raised when the upstream AI gateway responds with a structured JSON error envelope
 * (`{ "type": "error", "error": { "type": ..., "message": ... } }`). Surfaces as a typed
 * defect from `FunctionsAiHttpClient`, bypassing `@effect/ai`'s generic `HttpResponseError`
 * wrapping so callers can match on the error class directly.
 */
export class FunctionsAiUpstreamError extends BaseError.extend(
  'FunctionsAiUpstreamError',
  'Upstream AI service returned an error',
) {}

/**
 * Specialized `FunctionsAiUpstreamError` for the memoization layer: the recorded fixture for a
 * given cache key was not found and `ALLOW_LLM_GENERATION` is unset. The `cacheKey` is exposed
 * via `context.cacheKey` to make regeneration straightforward.
 */
export class FunctionsAiMemoizationMissError extends BaseError.extend(
  'FunctionsAiMemoizationMissError',
  'No memoized AI conversation found for the given cache key',
) {}
