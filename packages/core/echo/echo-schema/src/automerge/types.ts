//
// Copyright 2023 DXOS.org
//

import { type Reference } from '@dxos/document-model';

import { type ObjectMeta } from '../object';
import { type Schema } from '../proto';

export interface DocStructure {
  objects: {
    [key: string]: ObjectStructure;
  };
}

/**
 * Representation of an ECHO object in an AM document.
 */
export type ObjectStructure = {
  data: Record<string, any>;
  meta: ObjectMeta;
  system: ObjectSystem;
};

/**
 * Automerge object system properties.
 * (Is automerge specific.)
 */
export type ObjectSystem = {
  /**
   * Deletion marker.
   */
  deleted?: boolean;

  /**
   * Object type. Reference to the schema.
   */
  // TODO(mykola): It is not used right now.
  schema?: Schema;

  /**
   * Object reference ('protobuf' protocol) type.
   */
  type?: Reference;
};
