//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import { type EncodedReference, ObjectStructure, isEncodedReference } from '@dxos/echo-protocol';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';
import { assumeType, decodeUint8ArrayFromJson, deepMapValues, isEncodedUint8Array, visitValues } from '@dxos/util';

import type * as Database from '../../Database';
import type * as Obj from '../../Obj';
import { getTypeDXN, setTypename } from '../Annotation';
import { attachTypedJsonSerializer, defineHiddenProperty, typedJsonSerializer } from '../common/proxy';
import {
  ATTR_META,
  ATTR_PARENT,
  ATTR_TYPE,
  type AnyEntity,
  EntityKind,
  KindId,
  MetaId,
  ObjectMetaSchema,
  ParentId,
  setSchema,
} from '../common/types';
import {
  ATTR_DELETED,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_SELF_DXN,
  ObjectDatabaseId,
  type ObjectJSON,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  SelfDXNId,
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
  const typename = getTypeDXN(obj)?.toString();
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
 * @param options.dxn - Override object DXN.
 * @param options.database - Database to associate with the object.
 */
export const objectFromJSON = async (
  jsonData: unknown,
  {
    refResolver,
    dxn,
    database,
    parent,
  }: { refResolver?: RefResolver; dxn?: DXN; database?: Database.Database; parent?: Obj.Unknown } = {},
): Promise<AnyEntity> => {
  assumeType<ObjectJSON>(jsonData);
  assertArgument(typeof jsonData === 'object' && jsonData !== null, 'jsonData', 'expect object');
  assertArgument(typeof jsonData[ATTR_TYPE] === 'string', 'jsonData[ATTR_TYPE]', 'expected object to have a type');
  assertArgument(typeof jsonData.id === 'string', 'jsonData.id', 'expected object to have an id');

  const type = DXN.parse(jsonData[ATTR_TYPE]);
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

  invariant(ObjectId.isValid(obj.id), 'Invalid object id');
  setTypename(obj, type);
  if (schema) {
    setSchema(obj, schema);
  }

  const isRelation =
    typeof jsonData[ATTR_RELATION_SOURCE] === 'string' || typeof jsonData[ATTR_RELATION_TARGET] === 'string';
  if (isRelation) {
    const sourceDXN: DXN = DXN.parse(jsonData[ATTR_RELATION_SOURCE] ?? raise(new TypeError('Missing relation source')));
    const targetDXN: DXN = DXN.parse(jsonData[ATTR_RELATION_TARGET] ?? raise(new TypeError('Missing relation target')));

    const source = (await refResolver?.resolve(sourceDXN)) as AnyEntity | undefined;
    const target = (await refResolver?.resolve(targetDXN)) as AnyEntity | undefined;

    defineHiddenProperty(obj, KindId, EntityKind.Relation);
    defineHiddenProperty(obj, RelationSourceDXNId, sourceDXN);
    defineHiddenProperty(obj, RelationTargetDXNId, targetDXN);
    defineHiddenProperty(obj, RelationSourceId, source);
    defineHiddenProperty(obj, RelationTargetId, target);
  } else {
    defineHiddenProperty(obj, KindId, EntityKind.Object);
  }

  if (typeof jsonData[ATTR_META] === 'object') {
    const meta = await ObjectMetaSchema.pipe(Schema.decodeUnknownPromise)(jsonData[ATTR_META]);
    invariant(Array.isArray(meta.keys));
    defineHiddenProperty(obj, MetaId, meta);
  } else {
    defineHiddenProperty(obj, MetaId, {
      keys: [],
    });
  }

  if (jsonData[ATTR_PARENT]) {
    const parentDXN = DXN.parse(jsonData[ATTR_PARENT]);
    const resolvedParent = (await refResolver?.resolve(parentDXN)) as Obj.Unknown | undefined;
    defineHiddenProperty(obj, ParentId, resolvedParent);
  } else if (parent) {
    defineHiddenProperty(obj, ParentId, parent);
  }

  if (dxn) {
    defineHiddenProperty(obj, SelfDXNId, dxn);
  }

  if (database) {
    defineHiddenProperty(obj, ObjectDatabaseId, database);
  }

  assertObjectModel(obj);
  invariant((obj as any)[ATTR_TYPE] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_META] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_DELETED] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_SELF_DXN] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_RELATION_SOURCE] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_RELATION_TARGET] === undefined, 'Invalid object model');
  return obj;
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
    [ATTR_SELF_DXN]: _selfDXN,
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
 * Convert ObjectStructure to JSON data for indexing.
 * Different from {@link objectToJSON} as it takes the internal {@link ObjectStructure} representation directly
 */
export const objectStructureToJson = (objectId: string, structure: ObjectStructure): Obj.JSON => {
  return {
    ...structure.data,
    id: objectId,
    [ATTR_TYPE]: (ObjectStructure.getTypeReference(structure)?.['/'] ?? '') as DXN.String,
    [ATTR_DELETED]: ObjectStructure.isDeleted(structure),
    [ATTR_PARENT]: ObjectStructure.getParent(structure)?.['/'] as DXN.String | undefined,
    [ATTR_RELATION_SOURCE]: ObjectStructure.getRelationSource(structure)?.['/'] as DXN.String | undefined,
    [ATTR_RELATION_TARGET]: ObjectStructure.getRelationTarget(structure)?.['/'] as DXN.String | undefined,
  };
};
