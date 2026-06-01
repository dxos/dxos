//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as ParseResult from 'effect/ParseResult';
import * as Schema from 'effect/Schema';

import {
  type EncodedReference,
  EncodedReference as EncodedRef,
  ForeignKey,
  isEncodedReference,
} from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type Comparator, intersection } from '@dxos/util';

import type * as Entity from '../../../Entity';
import type * as Tag from '../../../Tag';
import { Dictionary } from '../../Annotation/dictionary';
// Type-only import (erased at runtime) — this module is part of the `common/types` barrel that
// `internal/Ref/ref` imports at load time, so a value import would create an eval-order cycle.
import type { Ref } from '../../Ref/ref';
import { type AnyProperties } from './base';

/**
 * Property name for meta when object is serialized to JSON.
 */
export const ATTR_META = '@meta';

/**
 * Metadata section.
 */
export const MetaId: Entity.Meta = Symbol.for('@dxos/echo/Meta') as any;

//
// EntityMeta
//

/**
 * Schema for references to {@link Tag} objects stored in {@link EntityMetaSchema.tags}.
 *
 * Defined inline (rather than via `Ref.Ref(Tag)`) so this deep-internal module imports neither the
 * `Tag` value nor the ref machinery — both would create an eval-order cycle. The codec only serves
 * the non-database (typed-handler) and JSON paths: database reads materialize live `Ref`s in the
 * echo handler, and database writes encode them via the handler's link assignment, so a structural
 * pass-through is sufficient here.
 */
const TagRefSchema: Schema.Schema<Ref<Tag.Tag>, EncodedReference> = Schema.declare<Ref<Tag.Tag>, EncodedReference, []>(
  [],
  {
    encode: () => (value) =>
      Effect.gen(function* () {
        if (isEncodedReference(value)) {
          return value;
        }
        // `Ref`-like (has a `uri`): encode to the on-wire `{ '/': uri }` form.
        if (value != null && typeof (value as Ref<Tag.Tag>).uri === 'string') {
          return EncodedRef.fromURI((value as Ref<Tag.Tag>).uri);
        }
        return yield* Effect.fail(new ParseResult.Unexpected(value, 'reference'));
      }),
    decode: () => (value) =>
      Effect.gen(function* () {
        // Pass the encoded reference through; the live `Ref` is materialized by the handler on read.
        if (isEncodedReference(value) || (value != null && typeof (value as Ref<Tag.Tag>).uri === 'string')) {
          // Codec boundary: the runtime value is an encoded reference, typed as the live ref.
          return value as unknown as Ref<Tag.Tag>;
        }
        return yield* Effect.fail(new ParseResult.Unexpected(value, 'reference'));
      }),
  },
);

export const EntityMetaSchema = Schema.Struct({
  keys: Schema.Array(ForeignKey),

  /**
   * Tags applied to this entity, as references to {@link Tag} objects.
   */
  tags: Schema.Array(TagRefSchema),

  /**
   * Fully-qualified registry key for the object (FQN format, e.g. `org.example.type.foo`).
   * Identifies the canonical registry entry the object instance was created from.
   */
  key: Schema.optional(Schema.String),

  /**
   * Semantic version of the registry entry the object was created from.
   * Must be a valid semver string (e.g. `1.2.3`).
   */
  version: Schema.optional(Schema.String),

  /**
   * Dictionary of annotations to this entity.
   */
  annotations: Dictionary,
});

export type EntityMeta = Schema.Schema.Type<typeof EntityMetaSchema>;

/*
 * Get metadata from object.
 * Only callable on the object root.
 *
 * @internal (use Obj.getMeta or Relation.getMeta)
 */
// TODO(burdon): Refine type to BaseObj.
export const getMeta = (obj: AnyProperties): EntityMeta => {
  const metadata = (obj as any)[MetaId];
  invariant(metadata, 'EntityMeta not found.');
  return metadata;
};

//
// Foreign keys
//

export const foreignKey = (source: string, id: string): ForeignKey => ({ source, id });
export const foreignKeyEquals = (a: ForeignKey, b: ForeignKey) => a.source === b.source && a.id === b.id;

// TODO(dmaretskyi): Move to echo-schema.
export const compareForeignKeys: Comparator<AnyProperties> = (a: AnyProperties, b: AnyProperties) =>
  intersection(getMeta(a).keys, getMeta(b).keys, foreignKeyEquals).length > 0;
