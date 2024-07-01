//
// Copyright 2024 DXOS.org
//

import { AST } from '@effect/schema';
import * as S from '@effect/schema/Schema';
import type { Simplify } from 'effect/Types';

import { type Comparator, intersection } from '@dxos/util';

import { getMeta } from './getter';

export const data = Symbol.for('dxos.echo.data');

export const TYPE_PROPERTIES = 'dxos.org/type/Properties';

// TODO(burdon): Use consistently (with serialization utils).
export const ECHO_ATTR_ID = '@id';
export const ECHO_ATTR_TYPE = '@type';
export const ECHO_ATTR_META = '@meta';

const _ForeignKeySchema = S.Struct({
  source: S.String,
  id: S.String,
});
export type ForeignKey = S.Schema.Type<typeof _ForeignKeySchema>;
export const ForeignKeySchema: S.Schema<ForeignKey> = _ForeignKeySchema;

export const ObjectMetaSchema = S.Struct({
  keys: S.mutable(S.Array(ForeignKeySchema)),
});
export type ObjectMeta = S.Schema.Type<typeof ObjectMetaSchema>;

export type ExcludeId<T> = Simplify<Omit<T, 'id'>>;

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

// TODO(burdon): Rename to just EchoObject?
export type EchoReactiveObject<T> = ReactiveObject<T> & Identifiable;

export const foreignKey = (source: string, id: string): ForeignKey => ({ source, id });
export const foreignKeyEquals = (a: ForeignKey, b: ForeignKey) => a.source === b.source && a.id === b.id;

export const compareForeignKeys: Comparator<ReactiveObject<any>> = (a: ReactiveObject<any>, b: ReactiveObject<any>) =>
  intersection(getMeta(a).keys, getMeta(b).keys, foreignKeyEquals).length > 0;

/**
 * Utility to split meta property from raw object.
 */
export const splitMeta = <T>(object: T & WithMeta): { object: T; meta?: ObjectMeta } => {
  const meta = object[ECHO_ATTR_META];
  delete object[ECHO_ATTR_META];
  return { meta, object };
};
