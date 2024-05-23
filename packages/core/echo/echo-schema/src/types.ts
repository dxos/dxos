//
// Copyright 2024 DXOS.org
//

import { AST } from '@effect/schema';
import * as S from '@effect/schema/Schema';
import type { Simplify } from 'effect/Types';

export const data = Symbol.for('dxos.echo.data');

export const TYPE_PROPERTIES = 'dxos.sdk.client.Properties';

// TODO(burdon): Use consistently.
export const ECHO_ATTR_ID = '@id';
export const ECHO_ATTR_TYPE = '@type';
export const ECHO_ATTR_META = '@meta';

export type ExcludeId<T> = Simplify<Omit<T, 'id'>>;

export const ForeignKeySchema = S.struct({
  source: S.string,
  id: S.string,
});

export type ForeignKey = S.Schema.Type<typeof ForeignKeySchema>;

export const ObjectMetaSchema = S.struct({
  keys: S.mutable(S.array(ForeignKeySchema)),
});

export type ObjectMeta = S.Schema.Type<typeof ObjectMetaSchema>;

/**
 * Utility to split meta property from raw object.
 */
export const splitMeta = <T>(object: T & { [ECHO_ATTR_META]?: ObjectMeta }): { object: T; meta?: ObjectMeta } => {
  const meta = object[ECHO_ATTR_META];
  delete object[ECHO_ATTR_META];
  return { meta, object };
};

/**
 * The raw object should not include the ECHO id, but may include metadata.
 */
export const RawObject = <T>(schema: S.Schema<T>): S.Schema<ExcludeId<T> & { [ECHO_ATTR_META]?: ObjectMeta }> => {
  return S.make(AST.omit(schema.ast, ['id']));
};

/**
 * Reactive object marker interface (does not change the shape of the object.)
 * Accessing properties triggers signal semantics.
 */
export type ReactiveObject<T> = { [K in keyof T]: T[K] };

export type EchoReactiveObject<T> = ReactiveObject<T> & Identifiable;

/**
 * Has `id`.
 */
// TODO(burdon): Rename BaseObject?
export interface Identifiable {
  readonly id: string;
}

/**
 * Reference to another ECHO object.
 */
export type Ref<T> = T | undefined;

export const foreignKey = (source: string, id: string): ForeignKey => ({ source, id });
export const foreignKeyEquals = (a: ForeignKey, b: ForeignKey) => a.source === b.source && a.id === b.id;
