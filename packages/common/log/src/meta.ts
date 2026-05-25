//
// Copyright 2023 DXOS.org
//

/**
 * Marker key + value injected on every {@link CallMetadata} object by the log transform plugin.
 * Used by {@link isLogMeta} to detect a log-meta argument at runtime (e.g. for variadic
 * `param_index: 'last'` callees that don't have a fixed meta slot).
 */
export const LOG_META_MARKER = '~LogMeta';

/**
 * Metadata injected by the log transform plugin.
 *
 * Field names are intentionally short to reduce the size of the generated code.
 */
export interface CallMetadata {
  /**
   * Marker tag — when present, equal to {@link LOG_META_MARKER} ({@link `'~LogMeta'`}).
   * Injected by the log transform plugin on every emitted meta object so that {@link isLogMeta}
   * can distinguish a meta argument from a regular user-supplied value at runtime.
   * Optional because hand-written `CallMetadata` literals (decorators, RPC mappers, tests)
   * don't need the marker — they are recognized by position in the call signature.
   */
  '~LogMeta'?: typeof LOG_META_MARKER;

  /**
   * File name.
   */
  F: string;

  /**
   * Line number.
   */
  L: number;

  /**
   * Value of `this` at the site of the log call.
   * Will be set to the class instance if the call is inside a method, or to the `globalThis` (`window` or `global`) otherwise.
   */
  S: any | undefined;

  /**
   * A callback that will invoke the provided function with provided arguments.
   * Useful in the browser to force a `console.log` call to have a certain stack-trace.
   */
  C?: (fn: Function, args: any[]) => void;

  /**
   * Source code of the argument list.
   */
  A?: string[];
}

/**
 * Type guard: `true` when `value` is a {@link CallMetadata} object emitted by the log transform plugin.
 * Detection is based on the presence of the {@link LOG_META_MARKER} marker key/value.
 */
export const isLogMeta = (value: unknown): value is CallMetadata => {
  return (
    value != null &&
    typeof value === 'object' &&
    (value as Record<string, unknown>)[LOG_META_MARKER] === LOG_META_MARKER
  );
};
