//
// Copyright 2025 DXOS.org
//

import { isEncodedReference, type EncodedReference } from '@dxos/echo-protocol';
import { assertArgument, failedInvariant, invariant } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';

import { getObjectDXN, setSchema } from './accessors';
import {
  ATTR_DELETED,
  ATTR_META,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_SELF_DXN,
  ATTR_TYPE,
  EntityKindId,
  MetaId,
  RelationSourceId,
  RelationTargetId,
  TypeId,
  type InternalObjectProps,
  type ObjectJSON,
} from './model';
import { getType, setTypename } from './typename';
import { Ref, refFromEncodedReference, RefImpl, setRefResolver, type RefResolver } from '../ref';
import { type AnyEchoObject, type BaseObject } from '../types';
import { Schema } from 'effect';
import { deepMapValues, visitValues } from '@dxos/util';
import { ObjectMetaSchema } from './meta';
import { defineHiddenProperty } from '../utils';
import { raise } from '@dxos/debug';
import { EntityKind } from '../ast';

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
  jsonData: ObjectJSON,
  { refResolver }: { refResolver?: RefResolver } = {},
): Promise<AnyEchoObject> => {
  assertArgument(typeof jsonData === 'object' && jsonData !== null, 'expect object');
  assertArgument(typeof jsonData[ATTR_TYPE] === 'string', 'expected object to have a type');
  assertArgument(typeof jsonData.id === 'string', 'expected object to have an id');

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
    let source: AnyEchoObject | DXN = DXN.parse(
      jsonData[ATTR_RELATION_SOURCE] ?? raise(new TypeError('Missing relation source')),
    );
    let target: AnyEchoObject | DXN = DXN.parse(
      jsonData[ATTR_RELATION_TARGET] ?? raise(new TypeError('Missing relation target')),
    );

    // TODO(dmaretskyi): Async!
    source = ((await refResolver?.resolve(source)) as AnyEchoObject | undefined) ?? source;
    target = ((await refResolver?.resolve(target)) as AnyEchoObject | undefined) ?? target;

    defineHiddenProperty(obj, EntityKindId, EntityKind.Relation);
    defineHiddenProperty(obj, RelationTargetId, target);
    defineHiddenProperty(obj, RelationSourceId, source);
  } else {
    defineHiddenProperty(obj, EntityKindId, EntityKind.Object);
  }

  if (typeof jsonData[ATTR_META] === 'object') {
    const meta = await ObjectMetaSchema.pipe(Schema.decodeUnknownPromise)(jsonData[ATTR_META]);

    // Defensive programming.
    invariant(Array.isArray(meta.keys));

    defineHiddenProperty(obj, MetaId, meta);
  }

  // Defensive programming.
  invariant(obj[ATTR_TYPE] === undefined);
  invariant(obj[ATTR_SELF_DXN] === undefined);
  invariant(obj[ATTR_DELETED] === undefined);
  invariant(obj[ATTR_RELATION_SOURCE] === undefined);
  invariant(obj[ATTR_RELATION_TARGET] === undefined);
  invariant(obj[ATTR_META] === undefined);

  return obj;
};

const decodeGeneric = (jsonData: unknown, options: { refResolver?: RefResolver }) => {
  return deepMapValues(jsonData, (value, recurse) => {
    if (isEncodedReference(value)) {
      return refFromEncodedReference(value, options.refResolver);
    }
    return recurse(value);
  });
};

const setRefResolverOnData = (obj: AnyEchoObject, refResolver: RefResolver) => {
  const go = (value: unknown) => {
    if (Ref.isRef(value)) {
      setRefResolver(value, refResolver);
    } else {
      visitValues(value, go);
    }
  };

  go(obj);
};

/**
 * @internal
 */
export const attachTypedJsonSerializer = (obj: any) => {
  const descriptor = Object.getOwnPropertyDescriptor(obj, 'toJSON');
  if (descriptor) {
    return;
  }

  Object.defineProperty(obj, 'toJSON', {
    value: typedJsonSerializer,
    writable: false,
    enumerable: false,
    configurable: false,
  });
};

// NOTE: KEEP as function.
const typedJsonSerializer = function (this: any) {
  const { id, [TypeId]: typename, [MetaId]: meta, ...rest } = this;
  const result: any = {
    id,
    [ATTR_TYPE]: typename.toString(),
  };

  if (this[RelationSourceId]) {
    result[ATTR_RELATION_SOURCE] = formatRelationConnector(this[RelationSourceId]).toString();
  }
  if (this[RelationTargetId]) {
    result[ATTR_RELATION_TARGET] = formatRelationConnector(this[RelationTargetId]).toString();
  }

  if (meta) {
    result[ATTR_META] = structuredClone(meta);
  }

  Object.assign(result, serializeData(rest));
  return result;
};

const formatRelationConnector = (value: BaseObject | DXN): DXN => {
  if (value instanceof DXN) {
    return value;
  }

  if (typeof value === 'object') {
    return getObjectDXN(value as InternalObjectProps) ?? failedInvariant('Missing relation connector');
  }

  return failedInvariant('Invalid relation connector');
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
