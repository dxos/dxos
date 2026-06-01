//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import type { EntityId, URI } from '@dxos/keys';
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
export type EntityProp = string;
export type EntityPropPath = EntityProp[];

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
    [id: string]: EntityStructure;
  };
  /**
   * Object id points to an automerge doc url where the object is embedded.
   */
  links?: {
    [echoUri: string]: string | RawString;
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

  getInlineObject: (doc: DatabaseDirectory, id: EntityId): EntityStructure | undefined => {
    return doc.objects?.[id];
  },

  getLink: (doc: DatabaseDirectory, id: EntityId): string | undefined => {
    return doc.links?.[id]?.toString();
  },

  make: ({
    spaceKey,
    objects,
    links,
  }: {
    spaceKey: string;
    objects?: Record<string, EntityStructure>;
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
export type EntityStructure = {
  // TODO(dmaretskyi): Missing in some cases.
  system?: EntitySystem;

  meta: EntityMeta;
  /**
   * User-defined data.
   * Adheres to schema in `system.type`
   */
  data: Record<string, any>;
};

// Helper methods to interact with the {@link EntityStructure}.
export const EntityStructure = Object.freeze({
  /**
   * @throws On invalid object structure.
   */
  getTypeReference: (object: EntityStructure): EncodedReference | undefined => {
    return object.system?.type;
  },

  /**
   * @throws On invalid object structure.
   */
  getEntityKind: (object: EntityStructure): 'object' | 'relation' | 'type' => {
    const kind = object.system?.kind ?? 'object';
    invariant(kind === 'object' || kind === 'relation' || kind === 'type', 'Invalid kind');
    return kind;
  },

  isDeleted: (object: EntityStructure): boolean => {
    return object.system?.deleted ?? false;
  },

  getRelationSource: (object: EntityStructure): EncodedReference | undefined => {
    return object.system?.source;
  },

  getRelationTarget: (object: EntityStructure): EncodedReference | undefined => {
    return object.system?.target;
  },

  getParent: (object: EntityStructure): EncodedReference | undefined => {
    return object.system?.parent;
  },

  /**
   * @returns All references in the data section of the object.
   */
  getAllOutgoingReferences: (object: EntityStructure): { path: EntityPropPath; reference: EncodedReference }[] => {
    const references: { path: EntityPropPath; reference: EncodedReference }[] = [];
    const visit = (path: EntityPropPath, value: unknown) => {
      if (isEncodedReference(value)) {
        references.push({ path, reference: value });
      } else {
        visitValues(value, (value, key) => visit([...path, String(key)], value));
      }
    };
    visitValues(object.data, (value, key) => visit([String(key)], value));
    return references;
  },

  getTags: (object: EntityStructure): (EncodedReference | string)[] => {
    return object.meta.tags ?? [];
  },

  makeObject: ({
    type,
    data,
    keys,
  }: {
    type: URI.URI;
    deleted?: boolean;
    keys?: ForeignKey[];
    data?: unknown;
  }): EntityStructure => {
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
    type: URI.URI;
    source: EncodedReference;
    target: EncodedReference;
    deleted?: boolean;
    keys?: ForeignKey[];
    data?: unknown;
  }): EntityStructure => {
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

  makeType: ({ type, keys, data }: { type: URI.URI; keys?: ForeignKey[]; data?: unknown }): EntityStructure => {
    return {
      system: {
        kind: 'type',
        type: { '/': type },
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
export type EntityMeta = {
  /**
   * Foreign keys.
   */
  keys: ForeignKey[];

  /**
   * Tags.
   * Encoded references to Tag objects within the space.
   *
   * NOTE: Optional for backwards compatibility; legacy data may store bare DXN strings, which are
   * upgraded to encoded references on read (see `object-core.ts`).
   */
  tags?: (EncodedReference | string)[];

  /**
   * Fully-qualified registry key for the object (FQN format, e.g. `org.example.type.foo`).
   * Identifies the canonical registry entry the object instance was created from.
   */
  key?: string;

  /**
   * Semantic version of the registry entry the object was created from.
   * Must be a valid semver string (e.g. `1.2.3`).
   */
  version?: string;

  /**
   * Dictionary of annotations to this entity.
   *
   * NOTE: Optional for backwards compatibility. Values are arbitrary decoded automerge primitives;
   * typed as `any` so `EntityStructure` stays assignable to `DecodedAutomergePrimaryValue`.
   */
  annotations?: { readonly [key: string]: any };
};

/**
 * Automerge object system properties.
 * (Is automerge specific.)
 */
export type EntitySystem = {
  /**
   * Entity kind. `'type'` covers persisted ECHO type definitions (instances of
   * the `Type.Type` meta-schema); `'object'` / `'relation'` cover regular ECHO
   * instances.
   */
  kind?: 'object' | 'relation' | 'type';

  /**
   * Object reference ('protobuf' protocol) type — DXN of the schema this
   * entity instantiates.
   *
   * - For `kind === 'object'` / `'relation'` instances, this is the URI of the
   *   user-defined schema the entity was created from (e.g. `dxn:type:org.example.Person:1.0.0`).
   * - For `kind === 'type'` entities (persisted Type.Type meta-instances) this
   *   is always the URI of the `TypeSchema` meta-schema itself
   *   (`dxn:org.dxos.type.schema:0.1.0`). The kind that the meta-instance
   *   _describes_ (object/relation/type) lives in `data.jsonSchema.entityKind`.
   */
  type?: EncodedReference;

  /**
   * Deletion marker.
   */
  deleted?: boolean;

  /**
   * Object parent.
   * Objects with no parent are at the top level of the object hierarchy in the space.
   */
  parent?: EncodedReference;

  /**
   * Only for relations.
   */
  source?: EncodedReference;

  /**
   * Only for relations.
   */
  target?: EncodedReference;
};

/**
 * Id property name.
 */
export const PROPERTY_ID = 'id';

/**
 * Data namespace.
 * The key on {@link EntityStructure} that contains the user-defined data.
 */
export const DATA_NAMESPACE = 'data';
