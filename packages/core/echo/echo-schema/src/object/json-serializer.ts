//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import { type EncodedReference, type ObjectMeta, isEncodedReference } from '@dxos/echo-protocol';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';
import { assumeType, deepMapValues, visitValues } from '@dxos/util';

import { EntityKind } from '../ast';
import { Ref, type RefResolver, refFromEncodedReference, setRefResolver } from '../ref';
import { type AnyEchoObject } from '../types';
import { defineHiddenProperty } from '../utils';

import { setSchema } from './accessors';
import { ObjectMetaSchema } from './meta';
import {
  ATTR_DELETED,
  ATTR_META,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_SELF_DXN,
  ATTR_TYPE,
  EntityKindId,
  MetaId,
  type ObjectJSON,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  SelfDXNId,
  TypeId,
  assertObjectModelShape,
} from './model';
import { getType, setTypename } from './typename';

type DeepReplaceRef<T> =
  T extends Ref<any> ? EncodedReference : T extends object ? { [K in keyof T]: DeepReplaceRef<T[K]> } : T;

type SerializedObject<T extends { id: string }> = { [K in keyof T]: DeepReplaceRef<T[K]> } & ObjectJSON;

/**
 * Converts object to it's JSON representation.
 */
export const objectToJSON = <T extends AnyEchoObject>(obj: T): SerializedObject<T> => {
  const typename = getType(obj)?.toString();
  invariant(typename && typeof typename === 'string');
  return typedJsonSerializer.call(obj);
};

/**
 * Creates an object from it's json representation.
 * Performs schema validation.
 * References and schema will be resolvable if the `refResolver` is provided.
 *
 * The function need to be async to support resolving the schema as well as the relation endpoints.
 */
export const objectFromJSON = async (
  jsonData: unknown,
  { refResolver, dxn }: { refResolver?: RefResolver; dxn?: DXN } = {},
): Promise<AnyEchoObject> => {
  assumeType<ObjectJSON>(jsonData);
  assertArgument(typeof jsonData === 'object' && jsonData !== null, 'jsonData', 'expect object');
  assertArgument(typeof jsonData[ATTR_TYPE] === 'string', 'jsonData[ATTR_TYPE]', 'expected object to have a type');
  assertArgument(typeof jsonData.id === 'string', 'jsonData.id', 'expected object to have an id');

  const type = DXN.parse(jsonData[ATTR_TYPE]);
  const schema = await refResolver?.resolveSchema(type);
  invariant(schema === undefined || Schema.isSchema(schema));

  let obj: any;
  if (schema != null) {
    obj = await schema.pipe(Schema.decodeUnknownPromise)(jsonData);
    if (refResolver) {
      setRefResolverOnData(obj, refResolver);
    }
  } else {
    obj = decodeGeneric(jsonData, { refResolver });
  }

  invariant(ObjectId.isValid(obj.id), 'Invalid object id');

  setTypename(obj, type);
  if (schema) {
    setSchema(obj, schema);
  }

  const isRelation =
    typeof jsonData[ATTR_RELATION_SOURCE] === 'string' || typeof jsonData[ATTR_RELATION_TARGET] === 'string';
  if (isRelation) {
    const sourceDxn: DXN = DXN.parse(jsonData[ATTR_RELATION_SOURCE] ?? raise(new TypeError('Missing relation source')));
    const targetDxn: DXN = DXN.parse(jsonData[ATTR_RELATION_TARGET] ?? raise(new TypeError('Missing relation target')));

    // TODO(dmaretskyi): Async!
    const source = (await refResolver?.resolve(sourceDxn)) as AnyEchoObject | undefined;
    const target = (await refResolver?.resolve(targetDxn)) as AnyEchoObject | undefined;

    defineHiddenProperty(obj, EntityKindId, EntityKind.Relation);
    defineHiddenProperty(obj, RelationSourceDXNId, sourceDxn);
    defineHiddenProperty(obj, RelationTargetDXNId, targetDxn);
    defineHiddenProperty(obj, RelationSourceId, source);
    defineHiddenProperty(obj, RelationTargetId, target);
  } else {
    defineHiddenProperty(obj, EntityKindId, EntityKind.Object);
  }

  if (typeof jsonData[ATTR_META] === 'object') {
    const meta = await ObjectMetaSchema.pipe(Schema.decodeUnknownPromise)(jsonData[ATTR_META]);

    // Defensive programming.
    invariant(Array.isArray(meta.keys));

    defineHiddenProperty(obj, MetaId, meta);
  }

  if (dxn) {
    defineHiddenProperty(obj, SelfDXNId, dxn);
  }

  assertObjectModelShape(obj);
  invariant((obj as any)[ATTR_TYPE] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_SELF_DXN] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_DELETED] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_RELATION_SOURCE] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_RELATION_TARGET] === undefined, 'Invalid object model');
  invariant((obj as any)[ATTR_META] === undefined, 'Invalid object model');
  return obj;
};

const decodeGeneric = (jsonData: unknown, options: { refResolver?: RefResolver }) => {
  const {
    [ATTR_TYPE]: _type,
    [ATTR_META]: _meta,
    [ATTR_DELETED]: _deleted,
    [ATTR_RELATION_SOURCE]: _relationSource,
    [ATTR_RELATION_TARGET]: _relationTarget,
    [ATTR_SELF_DXN]: _selfDxn,
    ...props
  } = jsonData as any;

  return deepMapValues(props, (value, recurse) => {
    if (isEncodedReference(value)) {
      return refFromEncodedReference(value, options.refResolver);
    }
    return recurse(value);
  });
};

export const setRefResolverOnData = (obj: AnyEchoObject, refResolver: RefResolver) => {
  const go = (value: unknown) => {
    if (Ref.isRef(value)) {
      setRefResolver(value, refResolver);
    } else {
      visitValues(value, go);
    }
  };

  go(obj);
};

export const attachTypedJsonSerializer = (obj: any) => {
  const descriptor = Object.getOwnPropertyDescriptor(obj, 'toJSON');
  if (descriptor) {
    return;
  }

  Object.defineProperty(obj, 'toJSON', {
    value: typedJsonSerializer,
    writable: false,
    enumerable: false,
    // Setting `configurable` to false breaks proxy invariants, should be fixable.
    configurable: true,
  });
};

// NOTE: KEEP as function.
const typedJsonSerializer = function (this: any) {
  const { id, ...rest } = this;
  const result: any = {
    id,
  };

  if (this[TypeId]) {
    result[ATTR_TYPE] = this[TypeId].toString();
  }

  if (this[SelfDXNId]) {
    result[ATTR_SELF_DXN] = this[SelfDXNId].toString();
  }

  if (this[RelationSourceDXNId]) {
    const sourceDXN = this[RelationSourceDXNId];
    invariant(sourceDXN instanceof DXN);
    result[ATTR_RELATION_SOURCE] = sourceDXN.toString();
  }
  if (this[RelationTargetDXNId]) {
    const targetDXN = this[RelationTargetDXNId];
    invariant(targetDXN instanceof DXN);
    result[ATTR_RELATION_TARGET] = targetDXN.toString();
  }

  if (this[MetaId]) {
    result[ATTR_META] = serializeMeta(this[MetaId]);
  }

  Object.assign(result, serializeData(rest));
  return result;
};

const serializeData = (data: unknown) => {
  return deepMapValues(data, (value, recurse) => {
    if (Ref.isRef(value)) {
      // TODO(dmaretskyi): Should this be configurable?
      return value.noInline().encode();
    }
    return recurse(value);
  });
};

const serializeMeta = (meta: ObjectMeta) => {
  return deepMapValues(meta, (value, recurse) => recurse(value));
};
