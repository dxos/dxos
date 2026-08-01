//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Obj, Type } from '@dxos/echo';

/**
 * Namespace prefix for the identity keys the engine derives from `Obj.Meta.keys`, so every type
 * gets foreign-key identity (Google `resourceName`, Linear id, …) without type-specific code.
 */
export const FOREIGN_KEY_PREFIX = 'fk';

/**
 * The single identity rule for a type: which normalized keys an object carries, how to derive the
 * same keys from a lookup input, and how to fold one object's fields into another.
 *
 * This is the identity half of the extractor pattern — an extractor's create-vs-merge decision and
 * an after-the-fact duplicate scan are the same question ("does this identity key already exist?")
 * and must not answer it differently. {@link Resolver}, `getOrCreate` and `findDuplicates` all read
 * their answer from here.
 */
export interface IdentitySpec<S extends Type.AnyObj = Type.AnyObj> {
  readonly type: S;
  /**
   * Identity keys carried by an object — normalized and namespaced (e.g. `email:alice@dxos.org`).
   * Two objects sharing ANY key are the same entity. Foreign keys are added by the engine.
   */
  keys(object: Type.InstanceType<S>): readonly string[];
  /**
   * Identity keys for a lookup input (e.g. `{ email }`), so a resolver and a duplicate scan share
   * one normalization. Return empty for an input this spec cannot key.
   */
  inputKeys(input: unknown): readonly string[];
  /**
   * Folds `source`'s fields into `target`, run inside `Obj.update`. Owns array unioning and
   * scalar precedence for the type; the engine never guesses at field semantics. `target` is
   * authoritative — fill gaps and union collections, never overwrite a set scalar.
   */
  merge(target: Obj.Mutable<Type.InstanceType<S>>, source: Type.InstanceType<S>): void;
  /**
   * Builds an empty, detached instance for the merge preview. The spec owns this because a type
   * may have required fields the engine cannot invent.
   */
  makeEmpty(): Type.InstanceType<S>;
}

/** Foreign-key identity keys, derived generically from `Obj.Meta.keys`. */
export const foreignKeys = (object: Obj.Unknown): string[] =>
  Obj.getMeta(object).keys.map(({ source, id }) => `${FOREIGN_KEY_PREFIX}:${source}:${id}`);

/**
 * Every identity key for an object: the spec's own keys plus the generic foreign keys. Duplicates
 * are removed so a caller can index without re-checking.
 */
export const identityKeys = <S extends Type.AnyObj>(
  spec: IdentitySpec<S>,
  object: Type.InstanceType<S>,
): readonly string[] => [...new Set([...spec.keys(object), ...foreignKeys(object as Obj.Unknown)])];

/**
 * Registry of the identity specs available to a run, keyed by typename. Mirrors
 * {@link ExtractorRegistry}: consuming plugins build the layer from whatever registration mechanism
 * they use, so this package stays framework-free.
 */
export class IdentityRegistry extends Context.Tag('@dxos/extractor/IdentityRegistry')<
  IdentityRegistry,
  {
    readonly get: (typename: string) => Effect.Effect<IdentitySpec | undefined>;
    readonly all: () => Effect.Effect<ReadonlyArray<IdentitySpec>>;
  }
>() {}

export const fromIdentitySpecs = (specs: ReadonlyArray<IdentitySpec<any>>) => {
  const byTypename = new Map(specs.map((spec) => [Type.getTypename(spec.type), spec as IdentitySpec]));
  return Layer.succeed(
    IdentityRegistry,
    IdentityRegistry.of({
      get: (typename) => Effect.succeed(byTypename.get(typename)),
      all: () => Effect.succeed([...byTypename.values()]),
    }),
  );
};
