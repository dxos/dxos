//
// Copyright 2024 DXOS.org
//

import { type AbstractChainedBatch, type AbstractSublevel } from 'abstract-level';
import { type Level } from 'level';

import { type EncodedReferenceObject } from './reference';

export type SpaceState = {
  // Url of the root automerge document.
  rootUrl?: string;
};

export interface SpaceDoc {
  access?: {
    spaceKey: string;
  };
  /**
   * Objects inlined in the current document.
   */
  objects?: {
    [key: string]: ObjectStructure;
  };
  /**
   * Object id points to an automerge doc url where the object is embedded.
   */
  links?: {
    [echoId: string]: string;
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
 * Echo object metadata.
 */
export type ObjectMeta = {
  /**
   * Foreign keys.
   */
  keys: ForeignKey[];
};

/**
 * Reference to an object in a foreign database.
 */
export type ForeignKey = {
  /**
   * Name of the foreign database/system.
   * E.g. `github.com`.
   */
  source?: string;

  /**
   * Id within the foreign database.
   */
  id?: string;
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
   * Object reference ('protobuf' protocol) type.
   */
  type?: EncodedReferenceObject;
};

export type LevelDB = Level<string, string>;
export type SubLevelDB = AbstractSublevel<any, string | Buffer | Uint8Array, string, string>;
export type BatchLevel = AbstractChainedBatch<any, string, string>;
