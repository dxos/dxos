//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import { type EncodedReference, EntityStructure, isEncodedReference } from '@dxos/echo-protocol';
import { assertArgument, invariant } from '@dxos/invariant';
import { EID, EntityId, URI } from '@dxos/keys';
import { assumeType, decodeUint8ArrayFromJson, deepMapValues, isEncodedUint8Array, visitValues } from '@dxos/util';

import type * as Database from '../../Database';
import type * as Obj from '../../Obj';
import { getTypeAnnotation, getTypeURI, setTypename } from '../Annotation';
import { attachTypedJsonSerializer, defineHiddenProperty, typedJsonSerializer } from '../common/proxy';
import {
  ATTR_PARENT,
  ATTR_TYPE,
  type AnyEntity,
  EntityKind,
  KindId,
  ParentId,
  setSchema,
  setType,
} from '../common/types';
import { ATTR_META, MetaId, EntityMetaSchema } from '../common/types/meta';
import {
  ATTR_DELETED,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_SELF_URI,
  ATTR_SELF_URI_LEGACY,
  ObjectDatabaseId,
  type ObjectJSON,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  SelfURIId,
  assertObjectModel,
} from '../Entity';
import { Ref, type RefResolver, refFromEncodedReference, setRefResolver } from '../Ref';

// Re-export for backward compatibility.
export { attachTypedJsonSerializer };

type DeepReplaceRef<T> =
  T extends Ref<any>
    ? EncodedReference
    : T extends object
      ? {
          [K in keyof T]: DeepReplaceRef<T[K]>;
        }
      : T;

type SerializedObject<T extends { id: string }> = {
  [K in keyof T]: DeepReplaceRef<T[K]>;
} & ObjectJSON;

/**
 * Converts object to it's JSON representation.
 */
export const objectToJSON = <T extends AnyEntity>(obj: T): SerializedObject<T> => {
  const typename = getTypeURI(obj);
  invariant(typename && typeof typename === 'string');
  return typedJsonSerializer.call(obj);
};

/**
 * Creates an object from it's json representation.
 * Performs schema validation.
 * References and schema will be resolvable if the `refResolver` is provided.
 * The function need to be async to support resolving the schema as well as the relation endpoints.
 *
 * @param jsonData - JSON representation of the object.
 * @param options.refResolver - Resolver for references.
 * @param options.uri - Override object URI.
 * @param options.database - Database to associate with the object.
 */
export const objectFromJSON = async (
  jsonData: unknown,
  {
    refResolver,
    uri,
    database,
    parent,
  }: { refResolver?: RefResolver; uri?: URI.URI; database?: Database.Database; parent?: Obj.Unknown } = {},
): Promise<AnyEntity> => {
  assumeType<ObjectJSON>(jsonData);
  assertArgument(typeof jsonData === 'object' && jsonData !== null, 'jsonData', 'expect object');
  assertArgument(typeof jsonData[ATTR_TYPE] === 'string', 'jsonData[ATTR_TYPE]', 'expected object to have a type');
  assertArgument(typeof jsonData.id === 'string', 'jsonData.id', 'expected object to have an id');

  const type = URI.make(jsonData[ATTR_TYPE]);
  const schema = await refResolver?.resolveSchema(type);
  invariant(schema === undefined || Schema.isSchema(schema));
  const decodedInput = restoreUint8Arrays(stripInternalJsonKeys(jsonData));

  let obj: any;
  if (schema != null) {
    obj = await schema.pipe(Schema.decodeUnknownPromise)(decodedInput);
    if (refResolver) {
      setRefResolverOnData(obj, refResolver);
    }
  } else {
    obj = decodeGeneric(decodedInput, { refResolver });
  }

  invariant(EntityId.isValid(obj.id), 'Invalid object id');
  setTypename(obj, type);
  if (schema) {
    setSchema(obj, schema);
  }
  // Resolve and stamp the source type entity, if the resolver provides one.
  // Lets `Obj.getType` / `Entity.getType` return a stable entity for objects
  // loaded via `Obj.fromJSON` (serializer / queue paths).
  if (refResolver?.resolveType) {
    const typeEntity = await refResolver.resolveType(type);
    if (typeEntity != null) {
      setType(obj, typeEntity);
    }
  }

  const isRelation =
    typeof jsonData[ATTR_RELATION_SOURCE] === 'string' || typeof jsonData[ATTR_RELATION_TARGET] === 'string';
  if (isRelation) {
    const sourceDxn = jsonData[ATTR_RELATION_SOURCE] ?? raise(new TypeError('Missing relation source'));
    const targetDxn = jsonData[ATTR_RELATION_TARGET] ?? raise(new TypeError('Missing relation target'));

    const source = (await refResolver?.resolve(sourceDxn)) as AnyEntity | undefined;
    const target = (await refResolver?.resolve(targetDxn)) as AnyEntity | undefined;

    defineHiddenProperty(obj, KindId, EntityKind.Relation);
    defineHiddenProperty(obj, RelationSourceDXNId, sourceDxn);
    defineHiddenProperty(obj, RelationTargetDXNId, targetDxn);
    defineHiddenProperty(obj, RelationSourceId, source);
    defineHiddenProperty(obj, RelationTargetId, target);
  } else {
    // Honour the schema's TypeAnnotation kind — persisted `Type.Type` entities
    // (e.g. dynamic schemas loaded from a snapshot import) must brand as
    // `KindId = Type`, not Object, otherwise `Filter.type(Type.Type)` /
    // `Type.isType` skip them and the schema registry never picks them up.
    // Mirrors the kind resolution in `createObject` (the in-memory path).
    const annotationKind = schema != null ? getTypeAnnotation(schema)?.kind : undefined;
    defineHiddenProperty(obj, KindId, annotationKind === EntityKind.Type ? EntityKind.Type : EntityKind.Object);
  }

  if (typeof jsonData[ATTR_META] === 'object') {
    const meta = await EntityMetaSchema.pipe(Schema.decodeUnknownPromise)(normalizeMeta(jsonData[ATTR_META]));
    invariant(Array.isArray(meta.keys));
    defineHiddenProperty(obj, MetaId, meta);
  } else {
    defineHiddenProperty(obj, MetaId, {
      keys: [],
      tags: [],
      annotations: {},
    });
  }

  if (jsonData[ATTR_PARENT]) {
    const parentDxn = jsonData[ATTR_PARENT];
    const resolvedParent = (await refResolver?.resolve(parentDxn)) as Obj.Unknown | undefined;
    defineHiddenProperty(obj, ParentId, resolvedParent);
  } else if (parent) {
    defineHiddenProperty(obj, ParentId, parent);
  }

  if (uri) {
    defineHiddenProperty(obj, SelfURIId, uri);
  }

  if (database) {
    defineHiddenProperty(obj, ObjectDatabaseId, database);
  }

  assertObjectModel(obj);
  invariant((obj as any)[ATTR_TYPE] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_META] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_DELETED] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_SELF_URI] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_SELF_URI_LEGACY] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_RELATION_SOURCE] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_RELATION_TARGET] === undefined, 'Invalid object model');
  return obj;
};

/**
 * Backfills required meta fields and upgrades legacy `tags` (bare URI strings) to encoded references
 * so serialized data produced before the tags-as-refs migration still decodes.
 */
const normalizeMeta = (meta: any): any => {
  const tags = Array.isArray(meta?.tags)
    ? meta.tags.map((tag: unknown) => (typeof tag === 'string' ? { '/': URI.make(tag) } : tag))
    : [];
  // Coalesce required fields so explicit `undefined` in legacy input doesn't override the defaults.
  return {
    ...meta,
    keys: Array.isArray(meta?.keys) ? meta.keys : [],
    tags,
    annotations: meta?.annotations ?? {},
  };
};

const decodeGeneric = (jsonData: unknown, options: { refResolver?: RefResolver }) => {
  const props = stripInternalJsonKeys(jsonData);

  return deepMapValues(props, (value, visitor) => {
    if (isEncodedReference(value)) {
      return refFromEncodedReference(value, options.refResolver);
    }
    if (isEncodedUint8Array(value)) {
      return decodeUint8ArrayFromJson(value);
    }

    return visitor(value);
  });
};

/**
 * Recursively replaces encoded `Uint8Array` JSON markers with actual `Uint8Array` instances.
 * Runs before schema decoding so `Schema.Uint8ArrayFromSelf` sees real bytes.
 */
const restoreUint8Arrays = (data: unknown): any =>
  deepMapValues(data, (value, recurse) => {
    if (isEncodedUint8Array(value)) {
      return decodeUint8ArrayFromJson(value);
    }
    return recurse(value);
  });

const stripInternalJsonKeys = (jsonData: unknown) => {
  const {
    [ATTR_TYPE]: _type,
    [ATTR_META]: _meta,
    [ATTR_DELETED]: _deleted,
    [ATTR_SELF_URI]: _selfUri,
    [ATTR_SELF_URI_LEGACY]: _legacySelfUri,
    [ATTR_RELATION_SOURCE]: _relationSource,
    [ATTR_RELATION_TARGET]: _relationTarget,
    ...props
  } = jsonData as any;

  return props;
};

export const setRefResolverOnData = (obj: AnyEntity, refResolver: RefResolver) => {
  const visitor = (value: unknown) => {
    if (Ref.isRef(value)) {
      setRefResolver(value, refResolver);
    } else {
      visitValues(value, visitor);
    }
  };

  visitor(obj);
};

/**
 * Convert EntityStructure to JSON data for indexing.
 * Different from {@link objectToJSON} as it takes the internal {@link EntityStructure} representation directly
 */
export const objectStructureToJson = (objectId: EntityId, structure: EntityStructure): Obj.JSON => {
  const typeRef = EntityStructure.getTypeReference(structure)?.['/'];
  const parent = EntityStructure.getParent(structure)?.['/'];
  const source = EntityStructure.getRelationSource(structure)?.['/'];
  const target = EntityStructure.getRelationTarget(structure)?.['/'];
  return {
    ...structure.data,
    id: objectId,
    [ATTR_TYPE]: typeRef ? URI.make(typeRef) : undefined,
    [ATTR_DELETED]: EntityStructure.isDeleted(structure),
    [ATTR_PARENT]: parent !== undefined ? EID.tryParse(parent) : undefined,
    [ATTR_RELATION_SOURCE]: source !== undefined ? EID.tryParse(source) : undefined,
    [ATTR_RELATION_TARGET]: target !== undefined ? EID.tryParse(target) : undefined,
  };
};
