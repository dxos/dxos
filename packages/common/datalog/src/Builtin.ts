//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Ast from './Ast.ts';

/**
 * A binding pattern, one character per argument: `b` must be bound before the call, `f` may be
 * free and is bound by the call. `"fb"` lets the first argument be generated from the second.
 */
export type Mode = string;

/** Arguments as seen by a built-in: `undefined` marks a free position of the selected mode. */
export type Arguments = ReadonlyArray<Ast.Value | undefined>;

/** A predicate implemented in code rather than by rules. */
export type Builtin = {
  readonly name: string;
  readonly arity: number;
  /** Accepted binding patterns; the all-bound pattern is always accepted. */
  readonly modes: ReadonlyArray<Mode>;
  /**
   * Set when the result can change with no change to the facts (a clock), so the engine
   * re-evaluates the rules that use it on `refresh`.
   */
  readonly volatile?: boolean;
  /** Returns every full argument tuple that holds and agrees with the bound arguments. */
  readonly evaluate: (args: Arguments) => Iterable<Ast.Tuple>;
};

/** Built-ins by name. */
export type Registry = ReadonlyMap<string, Builtin>;

/** Defines a built-in. */
export const make = (builtin: Builtin): Builtin => builtin;

/** Defines a test-only built-in: holds iff `test` returns true for its fully bound arguments. */
export const predicate = (
  name: string,
  arity: number,
  test: (args: Ast.Tuple) => boolean,
  options: { volatile?: boolean } = {},
): Builtin => ({
  name,
  arity,
  modes: ['b'.repeat(arity)],
  volatile: options.volatile,
  evaluate: (args) => {
    const bound = args.filter((arg): arg is Ast.Value => arg !== undefined);
    return bound.length === arity && test(bound) ? [bound] : [];
  },
});

/** Builds a registry, rejecting duplicate names. */
export const registry = (...builtins: ReadonlyArray<Builtin>): Registry => {
  const entries = new Map<string, Builtin>();
  for (const builtin of builtins) {
    if (entries.has(builtin.name)) {
      throw new Error(`Duplicate built-in: ${builtin.name}`);
    }
    if (builtin.modes.some((mode) => mode.length !== builtin.arity || /[^bf]/.test(mode))) {
      throw new Error(`Invalid mode for built-in ${builtin.name}/${builtin.arity}`);
    }
    entries.set(builtin.name, builtin);
  }
  return entries;
};

/** True if `builtin` can be called with exactly the `bound` argument positions bound. */
export const acceptsBinding = (builtin: Builtin, bound: ReadonlyArray<boolean>): boolean =>
  bound.every(Boolean) || builtin.modes.some((mode) => [...mode].every((flag, index) => flag === 'f' || bound[index]));
