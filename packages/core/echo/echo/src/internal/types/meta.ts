//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ForeignKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type Comparator, intersection } from '@dxos/util';

import { type BaseObject } from './types';

/**
 * Property name for meta when object is serialized to JSON.
 */
export const ATTR_META = '@meta';

/**
 * Metadata section.
 */
export const MetaId = Symbol.for('@dxos/echo/Meta');

//
// Keys
//

export const foreignKey = (source: string, id: string): ForeignKey => ({ source, id });
export const foreignKeyEquals = (a: ForeignKey, b: ForeignKey) => a.source === b.source && a.id === b.id;

// TODO(dmaretskyi): Move to echo-schema.
export const compareForeignKeys: Comparator<BaseObject> = (a: BaseObject, b: BaseObject) =>
  intersection(getMeta(a).keys, getMeta(b).keys, foreignKeyEquals).length > 0;

//
// ObjectMeta
//

// TODO(dmaretskyi): Rename to ObjectMeta
export const ObjectMetaSchema = Schema.mutable(
  Schema.Struct({
    keys: Schema.mutable(Schema.Array(ForeignKey)),

    /**
     * A set of tags.
     * Tags are arbitrary application-defined strings.
     * ECHO makes no assumptions about the tag structure.
     */
    // TODO(dmaretskyi): Has to be optional for compatibility with old data.
    // Defaulting to an empty array is possible but requires a bit more work.
    tags: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
  }),
);
export type ObjectMeta = Schema.Schema.Type<typeof ObjectMetaSchema>;

/**
 * Get metadata from object.
 * Only callable on the object root.
 * @deprecated Use {@link getMeta}.
 */
// TODO(dmaretskyi): Remove.
export const getObjectMeta = (obj: any): ObjectMeta => {
  return getMeta(obj);
};

/*
 * Get metadata from object.
 * Only callable on the object root.
 */
export const getMeta = (obj: BaseObject): ObjectMeta => {
  const metadata = (obj as any)[MetaId];
  invariant(metadata, 'ObjectMeta not found.');
  return metadata;
};
