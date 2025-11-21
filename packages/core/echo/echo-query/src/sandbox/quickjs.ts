//
// Copyright 2025 DXOS.org
//

import { type QuickJSContext, type QuickJSHandle, type SuccessOrFail } from '@dxos/vendor-quickjs';

/**
 * Unwraps a result and throws the underlying error.
 *
 * Replacement for `QuickJScontext.unwrapResult` because that seems to cause an OOM.
 */
// TODO(burdon): Factor out.
export const unwrapResult = <T>(context: QuickJSContext, result: SuccessOrFail<T, QuickJSHandle>): T => {
  if (result.error) {
    const contextError = context.dump(result.error);
    result.error.dispose();
    if (
      typeof contextError === 'object' &&
      typeof contextError.name === 'string' &&
      typeof contextError.message === 'string'
    ) {
      const error = new Error(contextError.message);
      Object.defineProperty(error, 'name', { value: contextError.name });
      const originalStack = error.stack;
      error.stack = `${contextError.name}: ${contextError.message}\n${contextError.stack}${originalStack?.split('\n').slice(1).join('\n') ?? ''}`;
      throw error;
    } else {
      throw new Error(String(contextError));
    }
  }

  return result.value;
};
