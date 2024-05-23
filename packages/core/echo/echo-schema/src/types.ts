//
// Copyright 2024 DXOS.org
//

import { AST } from '@effect/schema';
import * as S from '@effect/schema/Schema';
import type { Simplify } from 'effect/Types';

export const data = Symbol.for('dxos.echo.data');

export const TYPE_PROPERTIES = 'dxos.sdk.client.Properties';

// TODO(burdon): Use consistently (with serialization utils).
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

type WithMeta = { [ECHO_ATTR_META]?: ObjectMeta };

/**
 * The raw object should not include the ECHO id, but may include metadata.
 */
export const RawObject = <T>(schema: S.Schema<T>): S.Schema<ExcludeId<T> & WithMeta> => {
  return S.make(AST.omit(schema.ast, ['id']));
};

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

/**
 * Reactive object marker interface (does not change the shape of the object.)
 * Accessing properties triggers signal semantics.
 */
export type ReactiveObject<T> = { [K in keyof T]: T[K] };

export type EchoReactiveObject<T> = ReactiveObject<T> & Identifiable;

export const foreignKey = (source: string, id: string): ForeignKey => ({ source, id });
export const foreignKeyEquals = (a: ForeignKey, b: ForeignKey) => a.source === b.source && a.id === b.id;

/**
 * Utility to split meta property from raw object.
 */
export const splitMeta = <T>(object: T & WithMeta): { object: T; meta?: ObjectMeta } => {
  const meta = object[ECHO_ATTR_META];
  delete object[ECHO_ATTR_META];
  return { meta, object };
};
