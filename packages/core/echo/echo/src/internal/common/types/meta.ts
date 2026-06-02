//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type EncodedReference, ForeignKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { type Comparator, intersection } from '@dxos/util';

import type * as Entity from '../../../Entity';
import type * as Tag from '../../../Tag';
import { Dictionary } from '../../Annotation/dictionary';
// `meta` is no longer re-exported from the `common/types` barrel (see ./index.ts), so importing the
// Ref schema builder here no longer forms an eval-order cycle with `Annotation`/`Database`.
import { type Ref, createEchoReferenceSchema } from '../../Ref/ref';
import { type AnyProperties } from './base';
import { TagTypeDXN } from './well-known-types';

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
 * Built from the shared {@link createEchoReferenceSchema} (the same builder `Ref.Ref` uses) via
 * `Schema.suspend`, so it reuses the canonical ref codec rather than duplicating it. The Tag type
 * identity comes from the shared {@link TagTypeDXN} constant; `suspend` defers construction until
 * first use, and `Tag` is referenced type-only, so no `Tag` value import is needed.
 */
const TagRefSchema = Schema.suspend(
  (): Schema.Schema<Ref<Tag.Tag>, EncodedReference> =>
    // The factory yields a loosely-typed `Ref<any>` schema; narrow it to the Tag-typed ref.
    createEchoReferenceSchema(undefined, DXN.getName(TagTypeDXN), DXN.getVersion(TagTypeDXN)) as Schema.Schema<
      Ref<Tag.Tag>,
      EncodedReference
    >,
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
