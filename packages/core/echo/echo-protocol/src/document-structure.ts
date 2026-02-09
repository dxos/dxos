//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import type { DXN, ObjectId } from '@dxos/keys';
import { visitValues } from '@dxos/util';

import { type RawString } from './automerge';
import type { ForeignKey } from './foreign-key';
import { type EncodedReference, isEncodedReference } from './reference';
import { type SpaceDocVersion } from './space-doc-version';

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

  getInlineObject: (doc: DatabaseDirectory, id: ObjectId): ObjectStructure | undefined => {
    return doc.objects?.[id];
  },

  getLink: (doc: DatabaseDirectory, id: ObjectId): string | undefined => {
    return doc.links?.[id]?.toString();
  },

  make: ({
    spaceKey,
    objects,
    links,
  }: {
    spaceKey: string;
    objects?: Record<string, ObjectStructure>;
    links?: Record<string, RawString>;
  }): DatabaseDirectory => ({
    access: {
      spaceKey,
    },
    objects: objects ?? {},
    links: links ?? {},
  }),
});

/**
 * Representation of an ECHO object in an AM document.
 */
export type ObjectStructure = {
  // TODO(dmaretskyi): Missing in some cases.
  system?: ObjectSystem;

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
    return object.system?.type;
  },

  /**
   * @throws On invalid object structure.
   */
  getEntityKind: (object: ObjectStructure): 'object' | 'relation' => {
    const kind = object.system?.kind ?? 'object';
    invariant(kind === 'object' || kind === 'relation', 'Invalid kind');
    return kind;
  },

  isDeleted: (object: ObjectStructure): boolean => {
    return object.system?.deleted ?? false;
  },

  getRelationSource: (object: ObjectStructure): EncodedReference | undefined => {
    return object.system?.source;
  },

  getRelationTarget: (object: ObjectStructure): EncodedReference | undefined => {
    return object.system?.target;
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

  getTags: (object: ObjectStructure): string[] => {
    return object.meta.tags ?? [];
  },

  makeObject: ({
    type,
    data,
    keys,
  }: {
    type: DXN.String;
    deleted?: boolean;
    keys?: ForeignKey[];
    data?: unknown;
  }): ObjectStructure => {
    return {
      system: {
        kind: 'object',
        type: { '/': type },
      },
      meta: {
        keys: keys ?? [],
      },
      data: data ?? {},
    };
  },

  makeRelation: ({
    type,
    source,
    target,
    deleted,
    keys,
    data,
  }: {
    type: DXN.String;
    source: EncodedReference;
    target: EncodedReference;
    deleted?: boolean;
    keys?: ForeignKey[];
    data?: unknown;
  }): ObjectStructure => {
    return {
      system: {
        kind: 'relation',
        type: { '/': type },
        source,
        target,
        deleted: deleted ?? false,
      },
      meta: {
        keys: keys ?? [],
      },
      data: data ?? {},
    };
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

  /**
   * Tags.
   * An array of DXNs of Tag objects within the space.
   *
   * NOTE: Optional for backwards compatibilty.
   */
  tags?: string[];
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

/**
 * Id property name.
 */
export const PROPERTY_ID = 'id';

/**
 * Data namespace.
 * The key on {@link ObjectStructure} that contains the user-defined data.
 */
export const DATA_NAMESPACE = 'data';
