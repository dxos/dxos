//
// Copyright 2022 DXOS.org
//

import { getDebugName } from '@dxos/util';

import { type LogConfig, type LogFilter, type LogLevel } from './config';
import { type CallMetadata } from './meta';
import { getRelativeFilename } from './processors/common';
import { gatherLogInfoFromScope } from './scope';

/**
 * Optional object passed to the logging API.
 */
export type LogContext = Record<string, any> | Error | any;

/**
 * Normalized call-site metadata suitable for display and serialization.
 */
export interface ComputedLogMeta {
  /** Relative filename (normalized via {@link getRelativeFilename}). */
  filename?: string;

  /** Line number within the file. */
  line?: number;

  /** Debug name of the enclosing scope (class instance), e.g. `MyClass#3`. */
  context?: string;
}

/**
 * Fields required to construct a {@link LogEntry}.
 */
export interface LogEntryInit {
  level: LogLevel;
  message?: string;
  context?: LogContext;
  meta?: CallMetadata;
  error?: Error;
  /** Overrides the default timestamp ({@link Date.now}). */
  timestamp?: number;
}

/**
 * Record for a single log line processed by the logging pipeline.
 *
 * Raw fields (`level`, `message`, `context`, `meta`, `error`) are preserved so processors
 * can access unmodified inputs. Derived, lazily computed getters
 * ({@link computedContext}, {@link computedError}, {@link computedMeta}) centralize
 * the formatting logic shared across processors that write to serialized stores.
 */
export class LogEntry {
  /** Severity of this entry. */
  readonly level: LogLevel;

  /** Human-readable log message, if any. */
  readonly message?: string;

  /**
   * Raw context value passed at the call site. May be a record, an Error, a function
   * returning either, or any other value. Processors that need the flattened /
   * JSON-safe view should prefer {@link computedContext}.
   */
  readonly context?: LogContext;

  /** Raw call-site metadata injected by the log transform plugin. */
  readonly meta?: CallMetadata;

  /** Error passed to `log.catch()` / `log.error(err)`, if any. */
  readonly error?: Error;

  /** Unix timestamp in milliseconds of when the entry was created. */
  readonly timestamp: number;

  #computedContext: Record<string, unknown> | undefined;
  #computedContextComputed = false;
  #computedError: string | undefined;
  #computedErrorComputed = false;
  #computedMeta: ComputedLogMeta | undefined;
  #resolvedContext: unknown;
  #resolvedContextComputed = false;

  constructor(init: LogEntryInit) {
    this.level = init.level;
    this.message = init.message;
    this.context = init.context;
    this.meta = init.meta;
    this.error = init.error;
    this.timestamp = init.timestamp ?? Date.now();
  }

  /**
   * Resolve a function-valued {@link context} once and cache, so getters that
   * independently consult the raw context don't trigger duplicate evaluation.
   */
  #resolveContext(): unknown {
    if (!this.#resolvedContextComputed) {
      this.#resolvedContext = typeof this.context === 'function' ? this.context() : this.context;
      this.#resolvedContextComputed = true;
    }
    return this.#resolvedContext;
  }

  /**
   * Flattened, JSON-safe context intended for serialized stores.
   *
   * - Single-level key-value map.
   * - Primitives (`boolean`, `number`, `string`, `null`, `undefined`) pass through.
   * - Non-primitive values are stringified one level deep via `JSON.stringify` (no recursion).
   * - The reserved `error` / `err` keys are stripped — use {@link computedError} instead.
   * - Properties from `@logInfo`-decorated members of the scope (`meta.S`) are inlined.
   *
   * Lazily computed and memoized on first access.
   */
  get computedContext(): Record<string, unknown> {
    if (!this.#computedContextComputed) {
      this.#computedContext = computeContext(this, this.#resolveContext());
      this.#computedContextComputed = true;
    }
    return this.#computedContext ?? {};
  }

  /**
   * Stringified error for this entry, sourced (in priority order) from:
   *   1. {@link error} (e.g. `log.catch(err)`),
   *   2. {@link context} when the context itself is an {@link Error},
   *   3. `context.error` or `context.err`.
   *
   * Formatted as `.stack` when available, falling back to `.message` or `String(err)`.
   *
   * Lazily computed and memoized on first access.
   */
  get computedError(): string | undefined {
    if (!this.#computedErrorComputed) {
      this.#computedError = computeError(this, this.#resolveContext());
      this.#computedErrorComputed = true;
    }
    return this.#computedError;
  }

  /**
   * Normalized call-site metadata suitable for display / serialization.
   *
   * Lazily computed and memoized on first access.
   */
  get computedMeta(): ComputedLogMeta {
    if (this.#computedMeta === undefined) {
      this.#computedMeta = computeMeta(this);
    }
    return this.#computedMeta;
  }
}

/**
 * Processes (e.g., prints, forwards) log entries.
 */
export type LogProcessor = (config: LogConfig, entry: LogEntry) => void;

/**
 * Returns:
 * true if the log entry matches the filter,
 * false if should be excluded, or
 * undefined if it the filter doesn't match the level.
 */
const matchFilter = (filter: LogFilter, level: LogLevel, path?: string): boolean | undefined => {
  // TODO(burdon): Support regexp.
  if (filter.pattern?.startsWith('-')) {
    // Exclude.
    if (path?.includes(filter.pattern.slice(1))) {
      if (level >= filter.level) {
        return false;
      }
    }
  } else {
    // Include.
    if (filter.pattern?.length) {
      if (path?.includes(filter.pattern)) {
        return level >= filter.level;
      }
    } else {
      if (level >= filter.level) {
        return true;
      }
    }
  }
};

/**
 * Determines if the current line should be logged (called by the processor).
 */
export const shouldLog = (entry: LogEntry, filters?: LogFilter[]): boolean => {
  if (filters === undefined) {
    return false;
  }

  const results = filters
    .map((filter) => matchFilter(filter, entry.level, entry.meta?.F))
    .filter((result): result is boolean => result !== undefined);

  // Skip if any are explicitely false.
  // console.log({ level: entry.level, path: entry.meta?.F }, filters, results, results.length);
  return results.length > 0 && !results.some((results) => results === false);
};

/**
 * Merges scope info, entry context, and error into a single record — preserving nested
 * objects and Error instances so rich consumers (console inspect, devtools) can format them.
 *
 * Prefer {@link LogEntry.computedContext} for serialized / JSON outputs.
 */
export const getContextFromEntry = (entry: LogEntry): Record<string, any> | undefined => {
  let context;
  if (entry.meta) {
    const scopeInfo = gatherLogInfoFromScope(entry.meta.S);
    if (Object.keys(scopeInfo).length > 0) {
      context = Object.assign(context ?? {}, scopeInfo);
    }
  }

  const entryContext = typeof entry.context === 'function' ? entry.context() : entry.context;
  if (entryContext) {
    if (entryContext instanceof Error) {
      // Additional context from Error.
      const c = (entryContext as any).context;
      // If ERROR then show stacktrace.
      context = Object.assign(context ?? {}, { error: entryContext.stack, ...c });
    } else if (typeof entryContext === 'object') {
      context = Object.assign(context ?? {}, entryContext);
    }
  }

  if (entry.error) {
    context = Object.assign(context ?? {}, { error: entry.error });
  }

  return context && Object.keys(context).length > 0 ? context : undefined;
};

const RESERVED_ERROR_KEYS = new Set(['error', 'err']);

const stringifyOneLevel = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }
  const type = typeof value;
  if (type === 'boolean' || type === 'number' || type === 'string') {
    return value;
  }
  if (type === 'bigint') {
    return (value as bigint).toString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const computeContext = (entry: LogEntry, rawContext: unknown): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  const mergeInto = (source: unknown): void => {
    if (!source || typeof source !== 'object') {
      return;
    }
    for (const [key, value] of Object.entries(source)) {
      if (RESERVED_ERROR_KEYS.has(key)) {
        continue;
      }
      result[key] = stringifyOneLevel(value);
    }
  };

  if (entry.meta?.S !== undefined && entry.meta.S !== null) {
    mergeInto(gatherLogInfoFromScope(entry.meta.S));
  }

  if (rawContext instanceof Error) {
    // Structured debug info attached to thrown errors lives on `.context`.
    mergeInto((rawContext as any).context);
  } else {
    mergeInto(rawContext);
  }

  if (entry.error) {
    mergeInto((entry.error as any).context);
  }

  return result;
};

const stringifyError = (err: unknown): string | undefined => {
  if (err === null || err === undefined) {
    return undefined;
  }
  if (err instanceof Error) {
    return err.stack ?? err.message;
  }
  return String(err);
};

const computeError = (entry: LogEntry, rawContext: unknown): string | undefined => {
  if (entry.error !== undefined) {
    return stringifyError(entry.error);
  }

  if (rawContext instanceof Error) {
    return stringifyError(rawContext);
  }
  if (rawContext && typeof rawContext === 'object') {
    const ctxErr = (rawContext as any).error ?? (rawContext as any).err;
    if (ctxErr !== undefined && ctxErr !== null) {
      return stringifyError(ctxErr);
    }
  }

  return undefined;
};

const computeMeta = (entry: LogEntry): ComputedLogMeta => {
  if (!entry.meta) {
    return {};
  }

  const scope = entry.meta.S;
  // Skip globalThis and plain object scopes (module-level logs); only report class instances.
  let scopeContext: string | undefined;
  if (
    typeof scope === 'object' &&
    scope !== null &&
    scope !== globalThis &&
    Object.getPrototypeOf(scope) !== Object.prototype
  ) {
    scopeContext = getDebugName(scope);
  }

  return {
    filename: getRelativeFilename(entry.meta.F),
    line: entry.meta.L,
    context: scopeContext,
  };
};
