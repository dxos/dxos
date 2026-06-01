//
// Copyright 2026 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Types from 'effect/Types';

import type * as Annotation from '../../Annotation';

/**
 * Unique identifier for an annotation.
 */
export const Key = Schema.String.pipe(Schema.brand('~@dxos/echo/AnnotationKey'));
export type Key = Schema.Schema.Type<typeof Key>;

/**
 * Set of annotation values stored on entity meta or nested in schemas.
 */
export const Dictionary = Schema.Record({ key: Key, value: Schema.Unknown });
export interface Dictionary extends Schema.Schema.Type<typeof Dictionary> {}

/**
 * Get the value of an annotation from a dictionary.
 */
export const getDictionary = <T>(
  values: Annotation.Dictionary,
  annotation: Annotation.Annotation<T>,
): Option.Option<T> => {
  if (!(annotation.key in values)) {
    return Option.none();
  }

  return Function.pipe(values[annotation.key], Schema.decodeUnknownSync(annotation.schema), Option.some);
};

/**
 * Set the value of an annotation in a dictionary.
 */
export const setDictionary = <T>(
  values: Types.Mutable<Annotation.Dictionary>,
  annotation: Annotation.Annotation<T>,
  value: T,
): void => {
  values[annotation.key] = Schema.encodeSync(annotation.schema)(value);
};
