//
// Copyright 2024 DXOS.org
//

import { type RawString } from './automerge';
import { type EncodedReference } from './reference';
import { type SpaceDocVersion } from './space-doc-version';

export type SpaceState = {
  // Url of the root automerge document.
  rootUrl?: string;
};

// TODO(dmaretskyi): Rename DatabaseRootDoc.
export interface SpaceDoc {
  version?: SpaceDocVersion;

  access?: {
    spaceKey: string;
  };
  /**
   * Objects inlined in the current document.
   */
  objects?: {
    [id: string]: ObjectStructure;
  };
  /**
   * Object id points to an automerge doc url where the object is embedded.
   */
  links?: {
    [echoId: string]: string | RawString;
  };
}

/**
 * Representation of an ECHO object in an AM document.
 */
export type ObjectStructure = {
  system: ObjectSystem;
  meta: ObjectMeta;
  data: Record<string, any>;
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
   * E.g., `github.com`.
   */
  readonly source: string;

  /**
   * Id within the foreign database.
   */
  readonly id: string;
};

/**
 * Automerge object system properties.
 * (Is automerge specific.)
 */
export type ObjectSystem = {
  /**
   * Entity kind.
   */
  kind?: 'object' | 'relation';

  /**
   * Object reference ('protobuf' protocol) type.
   */
  type?: EncodedReference;

  /**
   * Deletion marker.
   */
  deleted?: boolean;

  /**
   * Only for relations.
   */
  source?: EncodedReference;

  /**
   * Only for relations.
   */
  target?: EncodedReference;
};
