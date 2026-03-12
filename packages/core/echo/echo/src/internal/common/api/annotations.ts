//
// Copyright 2025 DXOS.org
//

/**
 * Common annotation helpers shared by Obj and Relation modules.
 */

import {
  getDescriptionWithSchema,
  getLabelWithSchema,
  setDescriptionWithSchema,
  setLabelWithSchema,
} from '../annotations';
import { type Mutable } from '../proxy';
import { type AnyProperties, getSchema as getSchema$ } from '../types';

/**
 * Get the label of an entity.
 * Accepts both reactive entities and snapshots.
 */
export const getLabel = (entity: AnyProperties): string | undefined => {
  const schema = getSchema$(entity);
  if (schema != null) {
    return getLabelWithSchema(schema, entity);
  }
};

/**
 * Set the label of an entity.
 * Must be called within an Obj.change or Relation.change callback.
 */
export const setLabel = (entity: Mutable<AnyProperties>, label: string) => {
  const schema = getSchema$(entity);
  if (schema != null) {
    setLabelWithSchema(schema, entity, label);
  }
};

/**
 * Get the description of an entity.
 * Accepts both reactive entities and snapshots.
 */
export const getDescription = (entity: AnyProperties): string | undefined => {
  const schema = getSchema$(entity);
  if (schema != null) {
    return getDescriptionWithSchema(schema, entity);
  }
};

/**
 * Set the description of an entity.
 * Must be called within an Obj.change or Relation.change callback.
 */
export const setDescription = (entity: Mutable<AnyProperties>, description: string) => {
  const schema = getSchema$(entity);
  if (schema != null) {
    setDescriptionWithSchema(schema, entity, description);
  }
};
