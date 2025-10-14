//
// Copyright 2025 DXOS.org
//

import { trim } from '@dxos/util';

/**
 * Evaluate the script (with dependencies as arguments).
 */
export const evalScript = (code: string, deps: Record<string, any> = {}) => {
  // Create a sandboxed environment that blocks access to window and document.
  const sandbox = {
    ...deps,

    // Block access to global objects.
    window: undefined,
    document: undefined,
    globalThis: undefined,
    self: undefined,
    global: undefined,

    // Allow some safe globals.
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    JSON,
    console,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,

    // Note: undefined and null are not included as they are keywords, not variables.
  };

  // Create function with all sandbox keys as parameters.
  const sandboxKeys = Object.keys(sandbox);
  const sandboxValues = Object.values(sandbox);

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function(
    ...sandboxKeys,
    trim`
        'use strict';
        return ${code};
      `,
  );

  return fn(...sandboxValues);
};
