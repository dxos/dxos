//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { ForeignKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { type Comparator, intersection } from '@dxos/util';

import type { BaseObject } from '../types';

//
// ObjectMeta
// `

// TODO(dmaretskyi): Rename to ObjectMeta
export const ObjectMetaSchema = Schema.Struct({
  /**
   * Keys of this object in foreign systems.
   */
  keys: Schema.mutable(Schema.Array(ForeignKey)),

  /**
   * This object is a newer version of the objects that it succeeds.
   *
   * The specifics of how "succession" works is left to the specific application.
   */
  succeeds: Schema.mutable(Schema.Array(ObjectId)),
});

export type ObjectMeta = Schema.Schema.Type<typeof ObjectMetaSchema>;

export const foreignKey = (source: string, id: string): ForeignKey => ({ source, id });
export const foreignKeyEquals = (a: ForeignKey, b: ForeignKey) => a.source === b.source && a.id === b.id;

/**
 * Symbol to access meta on an object.
 * Must return {@link ObjectMeta} for this object.
 * Only callable on the object root.
 */
export const symbolMeta = Symbol.for('@dxos/schema/ObjectMeta');

/**
 * Get metadata from object.
 * Only callable on the object root.
 * @deprecated Use {@link getMeta}.
 */
// TODO(dmaretskyi): Remove.
export const getObjectMeta = (object: any): ObjectMeta => {
  return getMeta(object);
};

/*
 * Get metadata from object.
 * Only callable on the object root.
 */
export const getMeta = (obj: BaseObject): ObjectMeta => {
  const metadata = (obj as any)[symbolMeta];
  invariant(metadata, 'ObjectMeta not found.');
  return metadata;
};

// TODO(dmaretskyi): Move to echo-schema.
export const compareForeignKeys: Comparator<BaseObject> = (a: BaseObject, b: BaseObject) =>
  intersection(getMeta(a).keys, getMeta(b).keys, foreignKeyEquals).length > 0;
