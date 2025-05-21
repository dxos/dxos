//
// Copyright 2024 DXOS.org
//

import type { DXN } from '@dxos/keys';
import { type RawString } from './automerge';
import { isEncodedReference, type EncodedReference } from './reference';
import { type SpaceDocVersion } from './space-doc-version';
import { invariant } from '@dxos/invariant';
import { deepMapValues, visitValues } from '@dxos/util';
import type { ForeignKey } from './foreign-key';

export type SpaceState = {
  // Url of the root automerge document.
  rootUrl?: string;
};

/**
 * Array indexes get converted to strings.
 */
export type ObjectProp = string;
export type ObjectPropPath = ObjectProp[];

/**
 * Link to all documents that hold objects in the space.
 */
export interface DatabaseDirectory {
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

  /**
   * @deprecated
   * For backward compatibility.
   */
  experimental_spaceKey?: string;
}

export const DatabaseDirectory = Object.freeze({
  /**
   * @returns Space key in hex of the space that owns the document. In hex format. Without 0x prefix.
   */
  getSpaceKey: (doc: DatabaseDirectory): string | null => {
    // experimental_spaceKey is set on old documents, new ones are created with doc.access.spaceKey
    const rawSpaceKey = doc.access?.spaceKey ?? doc.experimental_spaceKey;
    if (rawSpaceKey == null) {
      return null;
    }

    const rawKey = String(rawSpaceKey);
    invariant(!rawKey.startsWith('0x'), 'Space key must not start with 0x');
    return rawKey;
  },
});

/**
 * Representation of an ECHO object in an AM document.
 */
export type ObjectStructure = {
  system: ObjectSystem;
  meta: ObjectMeta;
  /**
   * User-defined data.
   * Adheres to schema in `system.type`
   */
  data: Record<string, any>;
};

// Helper methods to interact with the {@link ObjectStructure}.
export const ObjectStructure = Object.freeze({
  /**
   * @throws On invalid object structure.
   */
  getTypeReference: (object: ObjectStructure): EncodedReference | undefined => {
    return object.system.type;
  },

  /**
   * @throws On invalid object structure.
   */
  getEntityKind: (object: ObjectStructure): 'object' | 'relation' => {
    const kind = object.system.kind;
    invariant(kind === 'object' || kind === 'relation', 'Invalid kind');
    return kind;
  },

  isDeleted: (object: ObjectStructure): boolean => {
    return object.system.deleted ?? false;
  },

  getRelationSource: (object: ObjectStructure): EncodedReference | undefined => {
    return object.system.source;
  },

  getRelationTarget: (object: ObjectStructure): EncodedReference | undefined => {
    return object.system.target;
  },

  /**
   * @returns All references in the data section of the object.
   */
  getAllOutgoingReferences: (object: ObjectStructure): { path: ObjectPropPath; reference: EncodedReference }[] => {
    const references: { path: ObjectPropPath; reference: EncodedReference }[] = [];
    const visit = (path: ObjectPropPath, value: unknown) => {
      if (isEncodedReference(value)) {
        references.push({ path, reference: value });
      } else {
        visitValues(value, (value, key) => visit([...path, String(key)], value));
      }
    };
    visitValues(object.data, (value, key) => visit([String(key)], value));
    return references;
  },
});

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
   * Only for relations.w
   */
  target?: EncodedReference;
};
