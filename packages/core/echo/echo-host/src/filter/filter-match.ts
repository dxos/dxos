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

/**
 * Matches a filter against an object structure as stored in automerge.
 */
export const filterMatchDoc: (filter: QueryAST.Filter, obj: MatchedDoc) => boolean = makeFilterMatcher(docAccessor);

/**
 * Matches a filter against the JSON form of an object.
 */
export const filterMatchObjectJSON: (filter: QueryAST.Filter, obj: ObjectJSON) => boolean =
  makeFilterMatcher(objectJSONAccessor);
