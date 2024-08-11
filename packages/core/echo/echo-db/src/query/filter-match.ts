//
// Copyright 2024 DXOS.org
//

import { Reference } from '@dxos/echo-protocol';
import { EXPANDO_TYPENAME, isReactiveObject, type EchoReactiveObject } from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';

import { type ObjectCore } from '../core-db';
import type { Filter } from './filter';

/**
 * Query logic that checks if object complaint with a filter.
 * @param echoObject used for predicate filters only.
 * @returns
 */
export const filterMatch = (
  filter: Filter,
  core: ObjectCore | undefined,
  // TODO(mykola): Remove predicate filters from this level query. Move it to higher proxy level.
  echoObject?: EchoReactiveObject<any> | undefined,
): boolean => {
  if (!core) {
    return false;
  }
  invariant(!echoObject || isReactiveObject(echoObject));
  const result = filterMatchInner(filter, core, echoObject);
  // don't apply filter negation to deleted object handling, as it's part of filter options
  return filter.not && !core.isDeleted() ? !result : result;
};

const filterMatchInner = (
  filter: Filter,
  core: ObjectCore,
  echoObject?: EchoReactiveObject<any> | undefined,
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

  if (filter.or.length) {
    for (const orFilter of filter.or) {
      if (filterMatch(orFilter, core, echoObject)) {
        return true;
      }
    }

    return false;
  }

  if (filter.type) {
    const type = core.getType();

    /** @deprecated TODO(mykola): Remove */
    const dynamicSchemaTypename = type?.objectId;

    // Separate branch for objects with dynamic schema and typename filters.
    // TODO(dmaretskyi): Better way to check if schema is dynamic.
    if (filter.type.protocol === 'protobuf' && dynamicSchemaTypename) {
      if (dynamicSchemaTypename !== filter.type.objectId) {
        return false;
      }
    } else {
      if (!type && filter.type.objectId !== EXPANDO_TYPENAME) {
        return false;
      } else if (type && !compareType(filter.type, type, core.database?.spaceKey)) {
        // Compare if types are equal.
        return false;
      }
    }
  }

  if (filter.properties) {
    for (const key in filter.properties) {
      invariant(key !== '@type');
      const value = filter.properties[key];

      // TODO(dmaretskyi): Should `id` be allowed in filter.properties?
      const actualValue = key === 'id' ? core.id : core.getDecoded(['data', key]);

      if (actualValue !== value) {
        return false;
      }
    }
  }

  if (filter.text !== undefined) {
    const objectText = legacyGetTextForMatch(core);

    const text = filter.text.toLowerCase();
    if (!objectText.toLowerCase().includes(text)) {
      return false;
    }
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

// Type comparison is a bit weird due to backwards compatibility requirements.
// TODO(dmaretskyi): Deprecate `protobuf` protocol to clean this up.
export const compareType = (expected: Reference, actual: Reference, spaceKey?: PublicKey) => {
  const host = actual.protocol !== 'protobuf' ? actual?.host ?? spaceKey?.toHex() : actual.host ?? 'dxos.org';

  if (
    actual.objectId !== expected.objectId ||
    actual.protocol !== expected.protocol ||
    (host !== expected.host && actual.host !== expected.host)
  ) {
    return false;
  } else {
    return true;
  }
};

/**
 * @deprecated
 */
// TODO(dmaretskyi): Cleanup.
const legacyGetTextForMatch = (core: ObjectCore): string => '';
// compositeRuntime.untracked(() => {
//   if (!isTypedObject(core.rootProxy)) {
//     return '';
//   }

//   return JSON.stringify(core.rootProxy.toJSON());
// });
