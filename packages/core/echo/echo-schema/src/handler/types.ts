//
// Copyright 2024 DXOS.org
//

import { AST } from '@effect/schema';
import * as S from '@effect/schema/Schema';
import type { Simplify } from 'effect/Types';

import type { ObjectMeta } from '../types';

// TODO(burdon): Use consistently.
export const ECHO_ATTR_TYPE = '@type';
export const ECHO_ATTR_META = '@meta';

export type ExcludeId<T> = Simplify<Omit<T, 'id'>>;

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

export const ObjectMetaSchema = S.struct({
  keys: S.mutable(
    S.array(
      S.partial(
        S.struct({
          source: S.string,
          id: S.string,
        }),
      ),
    ),
  ),
});

export type ObjectMetaType = S.Schema.Type<typeof ObjectMetaSchema>;
