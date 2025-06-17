//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { ForeignKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type Comparator, intersection } from '@dxos/util';

import { MetaId } from './model';
import type { BaseObject } from '../types';

//
// ObjectMeta
//

// TODO(dmaretskyi): Rename to ObjectMeta
export const ObjectMetaSchema = Schema.Struct({
  keys: Schema.mutable(Schema.Array(ForeignKey)),
});

export type ObjectMeta = Schema.Schema.Type<typeof ObjectMetaSchema>;

export const foreignKey = (source: string, id: string): ForeignKey => ({ source, id });
export const foreignKeyEquals = (a: ForeignKey, b: ForeignKey) => a.source === b.source && a.id === b.id;

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
  const metadata = (obj as any)[MetaId];
  invariant(metadata, 'ObjectMeta not found.');
  return metadata;
};

// TODO(dmaretskyi): Move to echo-schema.
export const compareForeignKeys: Comparator<BaseObject> = (a: BaseObject, b: BaseObject) =>
  intersection(getMeta(a).keys, getMeta(b).keys, foreignKeyEquals).length > 0;
