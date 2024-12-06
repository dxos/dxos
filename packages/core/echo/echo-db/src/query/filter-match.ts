//
// Copyright 2024 DXOS.org
//

import { Reference } from '@dxos/echo-protocol';
import { EXPANDO_TYPENAME, foreignKeyEquals } from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { isReactiveObject } from '@dxos/live-object';
import { log } from '@dxos/log';
import { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';

import { type Filter } from './filter';
import { type ObjectCore } from '../core-db';
import { getObjectCore, type ReactiveEchoObject } from '../echo-handler';

/**
 * Query logic that checks if object complaint with a filter.
 * @param echoObject used for predicate filters only.
 */
export const filterMatch = (
  filter: Filter,
  core: ObjectCore | undefined,
  // TODO(mykola): Remove predicate filters from this level query. Move it to higher proxy level.
  echoObject?: ReactiveEchoObject<any> | undefined,
): boolean => {
  if (!core) {
    return false;
  }

  invariant(!echoObject || isReactiveObject(echoObject));
  const result = filterMatchInner(filter, core, echoObject);
  // Don't apply filter negation to deleted object handling, as it's part of filter options.
  return filter.not && !core.isDeleted() ? !result : result;
};

const filterMatchInner = (
  filter: Filter,
  core: ObjectCore,
  echoObject?: ReactiveEchoObject<any> | undefined,
): boolean => {
  const deleted = filter.options.deleted ?? QueryOptions.ShowDeletedOption.HIDE_DELETED;
  if (core.isDeleted()) {
    if (deleted === QueryOptions.ShowDeletedOption.HIDE_DELETED) {
      return false;
    }
  } else {
    if (deleted === QueryOptions.ShowDeletedOption.SHOW_DELETED_ONLY) {
      return false;
    }
  }

  if (filter.objectIds) {
    if (!filter.objectIds.includes(core.id)) {
      return false;
    }
  }

  if (filter.or.length) {
    for (const orFilter of filter.or) {
      if (filterMatch(orFilter, core, echoObject)) {
        return true;
      }
    }

    return false;
  }

  if (filter.type) {
    const type = core.getType()?.toDXN() ?? DXN.fromTypename(EXPANDO_TYPENAME);
    log('type compare', { type, filterType: filter.type });
    if (!filter.type.some((filterType) => DXN.equals(filterType, type))) {
      return false;
    }
  }

  if (filter.properties) {
    for (const key in filter.properties) {
      invariant(key !== '@type');
      const value = sanitizePropertyFilter(filter.properties[key]);

      // TODO(dmaretskyi): Should `id` be allowed in filter.properties?
      const actualValue = key === 'id' ? core.id : core.getDecoded(['data', key]);
      if (!compareValues(actualValue, value)) {
        return false;
      }
    }
  }

  if (filter.metaKeys) {
    const keys = core.getMeta().keys;
    if (!filter.metaKeys.some((filterKey) => keys.some((key) => foreignKeyEquals(key, filterKey)))) {
      return false;
    }
  }

  if (filter.text !== undefined) {
    throw new Error('Text filter is not supported.');
  }

  // Untracked will prevent signals in the callback from being subscribed to.
  if (filter.predicate && !compositeRuntime.untracked(() => filter.predicate!(echoObject))) {
    return false;
  }

  for (const andFilter of filter.and) {
    if (!filterMatch(andFilter, core, echoObject)) {
      return false;
    }
  }

  return true;
};

// TODO(dmaretskyi): Should be resolved at the DSL level.
const sanitizePropertyFilter = (value: any) => {
  if (isReactiveObject(value)) {
    const core = getObjectCore(value as any);
    return Reference.fromDXN(DXN.fromLocalObjectId(core.id));
  }

  return value;
};

// TODO(dmaretskyi): Extract to echo-protocol.
const compareValues = (a: any, b: any) => {
  if (a instanceof Reference) {
    return b instanceof Reference && DXN.equals(a.toDXN(), b.toDXN());
  }

  return a === b;
};
