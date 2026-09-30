//
// Copyright 2025 DXOS.org
//

import { EntityStructure, type QueryAST } from '@dxos/echo-protocol';
import {
  ATTR_META,
  ATTR_PARENT,
  type FilterRecordAccessor,
  type ObjectJSON,
  filterMatchEntity,
  filterMatchValue,
  makeFilterMatcher,
} from '@dxos/echo/internal';
import { type EntityMeta } from '@dxos/index-core';
import { EntityId, SpaceId } from '@dxos/keys';

export { filterMatchEntity, filterMatchValue };

export type MatchedDoc = {
  id: EntityId;
  spaceId: SpaceId;
  doc: EntityStructure;
};

/**
 * Text search needs an index; the executors matching these representations have one behind them and
 * resolve text filters before reaching the in-memory matcher.
 */
const noTextSearch = () => false;

const docAccessor: FilterRecordAccessor<MatchedDoc> = {
  getId: (obj) => obj.id,
  // TODO(dmaretskyi): `system` is missing in some cases. Objects with no type are deprecated.
  getTypeURI: (obj) => obj.doc?.system?.type?.['/'],
  getProps: (obj) => obj.doc.data,
  getMeta: (obj) => obj.doc.meta,
  hasParent: (obj) => EntityStructure.getParent(obj.doc) !== undefined,
  matchTextSearch: noTextSearch,
};

const objectJSONAccessor: FilterRecordAccessor<ObjectJSON> = {
  getId: (obj) => obj.id,
  getTypeURI: (obj) => obj['@type'],
  getProps: (obj) => obj,
  getMeta: (obj) => obj[ATTR_META] ?? {},
  hasParent: (obj) => obj[ATTR_PARENT] !== undefined,
  matchTextSearch: noTextSearch,
};

/** Untyped objects are indexed under this placeholder type. */
const UNTYPED_INDEX_TYPE = 'type';

/** Index rows carry no properties or meta keys, so only id, type, parent and annotation predicates can match. */
const entityMetaAccessor: FilterRecordAccessor<EntityMeta> = {
  getId: (meta) => meta.objectId,
  getTypeURI: (meta) => (meta.typeDXN === UNTYPED_INDEX_TYPE ? undefined : meta.typeDXN),
  getProps: () => undefined,
  getMeta: (meta) => (meta.annotations === null ? {} : { annotations: JSON.parse(meta.annotations) }),
  hasParent: (meta) => meta.parent !== null,
  matchTextSearch: noTextSearch,
};

/**
 * Values of an object's device-scoped annotations, keyed by annotation key. They are stored apart from
 * every representation below, so a matcher is given them alongside the record.
 */
export type DeviceAnnotationValues = Readonly<Record<string, unknown>>;

type WithDeviceAnnotations<T> = { record: T; device: DeviceAnnotationValues | undefined };

/** An accessor whose meta also carries the record's device-scoped annotation values. */
const withDeviceAnnotations = <T>(
  accessor: FilterRecordAccessor<T>,
): FilterRecordAccessor<WithDeviceAnnotations<T>> => ({
  getId: ({ record }) => accessor.getId(record),
  getTypeURI: ({ record }) => accessor.getTypeURI(record),
  getProps: ({ record }) => accessor.getProps(record),
  getMeta: ({ record, device }) => {
    const meta = accessor.getMeta(record);
    return device === undefined ? meta : { ...meta, annotations: { ...meta.annotations, ...device } };
  },
  hasParent: ({ record }) => accessor.hasParent(record),
  matchTextSearch: (filter, { record }) => accessor.matchTextSearch(filter, record),
});

const matchDoc = makeFilterMatcher(withDeviceAnnotations(docAccessor));
const matchObjectJSON = makeFilterMatcher(withDeviceAnnotations(objectJSONAccessor));
const matchEntityMeta = makeFilterMatcher(withDeviceAnnotations(entityMetaAccessor));

/**
 * Matches a filter against an object structure as stored in automerge.
 */
export const filterMatchDoc = (filter: QueryAST.Filter, obj: MatchedDoc, device?: DeviceAnnotationValues): boolean =>
  matchDoc(filter, { record: obj, device });

/**
 * Matches a filter against the JSON form of an object.
 */
export const filterMatchObjectJSON = (
  filter: QueryAST.Filter,
  obj: ObjectJSON,
  device?: DeviceAnnotationValues,
): boolean => matchObjectJSON(filter, { record: obj, device });

/**
 * Matches a filter against an object's index row.
 */
export const filterMatchEntityMeta = (
  filter: QueryAST.Filter,
  meta: EntityMeta,
  device?: DeviceAnnotationValues,
): boolean => matchEntityMeta(filter, { record: meta, device });

/** The type URI an index row records, or `undefined` for an untyped object. */
export const getEntityMetaTypeURI = (meta: EntityMeta): string | undefined => entityMetaAccessor.getTypeURI(meta);
