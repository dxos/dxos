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
    console: undefined,
    document: undefined,
    global: undefined,
    globalThis: undefined,
    self: undefined,
    window: undefined,

    // Allow some safe globals.
    Array,
    Boolean,
    Date,
    Error,
    JSON,
    Map,
    Math,
    Number,
    Object,
    Promise,
    RegExp,
    Set,
    String,

    // Functions.
    isFinite,
    isNaN,
    parseFloat,
    parseInt,

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

/**
 * Globals.
 */
export const builtIns = new Set([
  // Types.
  'Array',
  'Date',
  'Error',
  'JSON',
  'Map',
  'Math',
  'Number',
  'Object',
  'Promise',
  'RegExp',
  'Set',
  'String',

  // Functions.
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
]);

/**
 * Default system definitions.
 */
export const systemDefinitions = trim`
  interface Array<T> { length: number; [n: number]: T; }
  interface Boolean {}
  interface Function {}
  interface IArguments {}
  interface Number {}
  interface Object {}
  interface RegExp {}
  interface String { length: number; }

  interface CallableFunction extends Function {}
  interface NewableFunction extends Function {}

  declare var console: { log(...args: any[]): void };
`;
