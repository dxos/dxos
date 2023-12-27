//
// Copyright 2023 DXOS.org
//

import { type Reference } from '@dxos/document-model';

import { type ObjectMeta } from '../object';
import { type Schema } from '../proto';

export interface DocStructure {
  objects: {
    [key: string]: { data: Record<string | symbol, any>; meta: ObjectMeta; system: ObjectSystem };
  };
}

/**
 * Automerge object system properties.
 * (Is automerge specific.)
 */
export type ObjectSystem = {
  /**
   * Deletion marker.
   */
  deleted: boolean;

  /**
   * Object type. Reference to the schema.
   */
  // TODO(mykola): It is not used right now.
  schema: Schema;

  /**
   * Object reference ('protobuf' protocol) type.
   */
  type: Reference;
};
