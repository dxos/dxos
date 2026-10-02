//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { createAnnotationHelper } from '../Annotation/util.ts';
import { type AnyProperties } from '../common/types/index.ts';
import { getImplementation, getPaths, getWithSchema, make, setWithSchema } from './property.ts';

/**
 * Identifies label property or JSON path expression.
 * Either a string or an array of strings representing field accessors each matched in priority order.
 *
 * This is the serialized (JSON schema `labelProp`) form of a path implementation of {@link Title};
 * `LabelAnnotation.set(paths)` is equivalent to `Property.implement(Title, { path: paths })`.
 */
export const LabelAnnotationId = '@dxos/schema/annotation/Label';
export const LabelAnnotation = createAnnotationHelper<string[]>(LabelAnnotationId);

const DEFAULT_LABEL_PATH = 'name';

/**
 * The display title of an entity.
 * Resolution: an explicit `Property.implement(Title, ...)`, else {@link LabelAnnotation}, else `name`.
 */
export const Title = make<string>({
  key: 'org.dxos.property.title',
  schema: Schema.String,
  title: 'Title',
  description: 'Human-readable display title of an entity.',
  // Whitespace-only strings fall through to the next accessor; scalar values are stringified.
  normalize: (value) => {
    switch (typeof value) {
      case 'string':
        return value.trim().length > 0 ? value : undefined;
      case 'number':
      case 'boolean':
      case 'bigint':
      case 'symbol':
        return value.toString();
      default:
        return undefined;
    }
  },
  fallback: (schema) =>
    Option.some({
      path: LabelAnnotation.get(schema).pipe(Option.getOrElse(() => [DEFAULT_LABEL_PATH])),
    }),
});

/**
 * Returns the label for a given object via the schema's {@link Title} implementation.
 * Lower-level version that requires explicit schema parameter.
 */
export const getLabelWithSchema = <S extends Schema.Top>(
  schema: S,
  object: Schema.Schema.Type<S>,
): string | undefined => getWithSchema(schema, Title, object);

/**
 * Sets the label for a given object via the schema's {@link Title} implementation.
 * Lower-level version that requires explicit schema parameter.
 * No-op when the type implements the title one-way (read-only).
 */
// `object` is not typed by the schema: the implementation names the property at runtime, and TypeScript
// cannot index-write a generic type parameter.
export const setLabelWithSchema = (schema: Schema.Top, object: AnyProperties, label: string): void => {
  setWithSchema(schema, Title, object, label);
};

/**
 * Returns the primary field backing the schema's {@link Title}, or `undefined` when it is computed.
 */
export const getLabelPropertyWithSchema = (schema: Schema.Top): string | undefined =>
  getImplementation(schema, Title).pipe(
    Option.flatMap((implementation) => Option.fromNullishOr(getPaths(implementation)[0])),
    Option.getOrUndefined,
  );
