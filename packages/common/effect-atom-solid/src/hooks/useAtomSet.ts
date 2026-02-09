//
// Copyright 2025 DXOS.org
//

import type * as Atom from '@effect-atom/atom/Atom';
import * as Registry from '@effect-atom/atom/Registry';
import type * as Result from '@effect-atom/atom/Result';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { onCleanup } from 'solid-js';

import { useRegistry } from '../registry';

const flattenExit = <A, E>(exit: Exit.Exit<A, E>): A => {
  if (Exit.isSuccess(exit)) return exit.value;
  throw Cause.squash(exit.cause);
};

export type SetAtomFn<R, W, Mode extends 'value' | 'promise' | 'promiseExit'> = 'promise' extends Mode
  ? (value: W) => Promise<Result.Result.Success<R>>
  : 'promiseExit' extends Mode
    ? (value: W) => Promise<Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>>
    : (value: W | ((value: R) => W)) => void;

export function createSetAtom<R, W, Mode extends 'value' | 'promise' | 'promiseExit' = never>(
  registry: Registry.Registry,
  atom: Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [Result.Result<any, any>] ? Mode : 'value') | undefined;
  },
): SetAtomFn<R, W, Mode> {
  if (options?.mode === 'promise' || options?.mode === 'promiseExit') {
    return ((value: W) => {
      registry.set(atom, value);
      const promise = Effect.runPromiseExit(
        Registry.getResult(registry, atom as Atom.Atom<Result.Result<any, any>>, { suspendOnWaiting: true }),
      );
      return options!.mode === 'promise' ? promise.then(flattenExit) : promise;
    }) as SetAtomFn<R, W, Mode>;
  }
  return ((value: W | ((value: R) => W)) => {
    registry.set(atom, typeof value === 'function' ? (value as any)(registry.get(atom)) : value);
  }) as SetAtomFn<R, W, Mode>;
}

/**
 * Hook to get a setter function for an atom
 * Also mounts the atom in the registry
 */
export function useAtomSet<R, W, Mode extends 'value' | 'promise' | 'promiseExit' = never>(
  atom: Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [Result.Result<any, any>] ? Mode : 'value') | undefined;
  },
): SetAtomFn<R, W, Mode> {
  const registry = useRegistry();

  // Mount the atom
  const unmount = registry.mount(atom);
  onCleanup(unmount);

  return createSetAtom(registry, atom, options);
}
