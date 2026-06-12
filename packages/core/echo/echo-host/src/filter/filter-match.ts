//
// Copyright 2025 DXOS.org
//

import * as semver from 'semver';

import { EncodedReference, EntityStructure, type QueryAST, isEncodedReference } from '@dxos/echo-protocol';
import { ATTR_META, type ObjectJSON } from '@dxos/echo/internal';
import { DXN, EID, EntityId, SpaceId } from '@dxos/keys';

export type MatchedObject = {
  id: EntityId;
  spaceId: SpaceId;
  doc: EntityStructure;
};

/**
 * Matches a tag filter against an object's stored tags. Tags may be stored as encoded references or
 * (in legacy data) bare URI strings, and those URIs may be in legacy DXN form. Both sides are
 * normalized to the canonical EID before comparing, so a query by the modern id matches objects
 * tagged before the migration (and vice versa). Shared by the doc and JSON match paths.
 */
const matchesTag = (tags: readonly unknown[], filterTag: string): boolean => {
  // Canonicalize a tag URI for comparison. For EIDs, compare by entity id so the local
  // (`echo:/<id>`) and fully-qualified (`echo://<space>/<id>`) forms of the same object match, and
  // legacy DXN ids normalize to the same id. Non-EID ids fall back to the raw string.
  const canonical = (uri: string): string => {
    const eid = EID.tryParse(uri);
    return (eid && EID.getEntityId(eid)) || uri;
  };
  const normalize = (tag: unknown): string =>
    canonical(isEncodedReference(tag) ? EncodedReference.toURI(tag) : (tag as string));
  const target = canonical(filterTag);
  return tags.some((tag) => normalize(tag) === target);
};

/**
 * Matches an object against a filter AST.
 * @param obj object structure as stored in automerge.
 */
export const filterMatchObject = (filter: QueryAST.Filter, obj: MatchedObject): boolean => {
  switch (filter.type) {
    case 'object': {
      // Check typename if specified.
      if (filter.typename !== null) {
        // TODO(dmaretskyi): `system` is missing in some cases.
        const actualDXNStr = obj.doc?.system?.type?.['/'];
        if (!actualDXNStr) {
          // Objects with no type are deprecated.
          return false;
        }
        if (!compareTypenameStrings(filter.typename, actualDXNStr)) {
          return false;
        }
      }

      // Check IDs if specified.
      if (filter.id && filter.id.length > 0 && !filter.id.includes(obj.id)) {
        return false;
      }

      // Check properties.
      if (filter.props) {
        for (const [key, valueFilter] of Object.entries(filter.props)) {
          const value = obj.doc.data[key];
          if (!filterMatchValue(valueFilter, value)) {
            return false;
          }
        }
      }

      // Check foreign keys if specified.
      if (filter.foreignKeys && filter.foreignKeys.length > 0) {
        const hasMatchingKey = filter.foreignKeys.some((filterKey) =>
          obj.doc.meta.keys.some((objKey) => objKey.source === filterKey.source && objKey.id === filterKey.id),
        );
        if (!hasMatchingKey) {
          return false;
        }
      }

      // Check registry meta key / version if specified.
      if (
        filter.metaKey !== undefined &&
        !matchMetaKey(filter.metaKey, filter.metaVersion, obj.doc.meta.key, obj.doc.meta.version)
      ) {
        return false;
      }

      return true;
    }

    case 'tag': {
      return matchesTag(EntityStructure.getTags(obj.doc), filter.tag);
    }

    case 'text-search': {
      // TODO(???): Implement text search.
      return false;
    }

    case 'timestamp': {
      throw new Error('Timestamp filters must be handled at the index level, not in-memory matching.');
    }

    case 'child-of': {
      throw new Error('child-of filters must be handled at the executor level, not in-memory matching.');
    }

    case 'not': {
      return !filterMatchObject(filter.filter, obj);
    }

    case 'and': {
      return filter.filters.every((f) => filterMatchObject(f, obj));
    }

    case 'or': {
      return filter.filters.some((f) => filterMatchObject(f, obj));
    }

    default:
      return false;
  }
};

/**
 * Matches a meta `key` / `version` constraint against an object's meta `key` and `version`.
 * - `key` must match exactly.
 * - If `versionRange` is set, the object's `version` must satisfy it (semver).
 *   Objects without a `version` or with an invalid `version` do not match a version-constrained filter.
 */
const matchMetaKey = (
  key: string,
  versionRange: string | undefined,
  objKey: string | undefined,
  objVersion: string | undefined,
): boolean => {
  if (objKey !== key) {
    return false;
  }
  if (versionRange === undefined) {
    return true;
  }
  if (objVersion === undefined || semver.valid(objVersion) === null) {
    return false;
  }
  if (semver.validRange(versionRange) === null) {
    return false;
  }
  return semver.satisfies(objVersion, versionRange, { includePrerelease: true });
};

// TODO(burdon): Reconcile with filterMatchObject.
export const filterMatchObjectJSON = (filter: QueryAST.Filter, obj: ObjectJSON): boolean => {
  switch (filter.type) {
    case 'object': {
      // Check typename if specified
      if (filter.typename !== null) {
        // TODO(dmaretskyi): `system` is missing in some cases.
        const actualDXNStr = obj['@type'];
        if (!actualDXNStr) {
          // Objects with no type are deprecated.
          return false;
        }
        if (!compareTypenameStrings(filter.typename, actualDXNStr)) {
          return false;
        }
      }

      // Check IDs if specified
      if (filter.id && filter.id.length > 0 && !filter.id.includes(obj.id)) {
        return false;
      }

      // Check properties
      if (filter.props) {
        for (const [key, valueFilter] of Object.entries(filter.props)) {
          if (key.startsWith('@')) {
            // ignore meta properties
            continue;
          }
          const value = (obj as any)[key];
          if (!filterMatchValue(valueFilter, value)) {
            return false;
          }
        }
      }

      // Check foreign keys if specified
      if (filter.foreignKeys && filter.foreignKeys.length > 0) {
        const hasMatchingKey = filter.foreignKeys.some((filterKey) =>
          obj['@meta']?.keys?.some((objKey) => objKey.source === filterKey.source && objKey.id === filterKey.id),
        );
        if (!hasMatchingKey) {
          return false;
        }
      }

      // Check registry meta key / version if specified.
      if (
        filter.metaKey !== undefined &&
        !matchMetaKey(filter.metaKey, filter.metaVersion, obj[ATTR_META]?.key, obj[ATTR_META]?.version)
      ) {
        return false;
      }

      return true;
    }

    case 'tag': {
      return matchesTag(obj[ATTR_META]?.tags ?? [], filter.tag);
    }

    // TODO: Implement text search.
    case 'text-search': {
      return false;
    }

    case 'timestamp': {
      throw new Error('Timestamp filters must be handled at the index level, not in-memory matching.');
    }

    case 'child-of': {
      throw new Error('child-of filters must be handled at the executor level, not in-memory matching.');
    }

    case 'not': {
      return !filterMatchObjectJSON(filter.filter, obj);
    }

    case 'and': {
      return filter.filters.every((f) => filterMatchObjectJSON(f, obj));
    }

    case 'or': {
      return filter.filters.some((f) => filterMatchObjectJSON(f, obj));
    }

    default:
      return false;
  }
};

/**
 * Performs structural matching between a filter object and a target object.
 * This handles nested object comparison for array matching scenarios.
 */
// TODO(wittjosiah): Add ast support for non-strict matching.
const structuralMatch = (filterObj: any, targetObj: any, strict = true): boolean => {
  if (typeof filterObj !== 'object' || filterObj === null) {
    return filterObj === targetObj;
  }

  if (typeof targetObj !== 'object' || targetObj === null) {
    return false;
  }

  // Prohibit extra keys in targetObj.
  const filterKeys = Object.keys(filterObj);
  const targetKeys = Object.keys(targetObj);
  if (strict && filterKeys.length !== targetKeys.length) {
    return false;
  }

  return filterKeys.every((key) => {
    if (!(key in targetObj)) {
      return false;
    }
    const filterValue = filterObj[key];
    const targetValue = targetObj[key];

    if (typeof filterValue === 'object' && filterValue !== null) {
      return structuralMatch(filterValue, targetValue);
    }

    return filterValue === targetValue;
  });
};

export const filterMatchValue = (filter: QueryAST.Filter, value: unknown): boolean => {
  switch (filter.type) {
    case 'compare': {
      const compareValue = filter.value as any;
      switch (filter.operator) {
        case 'eq':
          if (isEncodedReference(compareValue)) {
            if (!isEncodedReference(value)) {
              return false;
            }
            return EncodedReference.toURI(value) === EncodedReference.toURI(compareValue);
          }
          return value === compareValue;
        case 'neq':
          return value !== compareValue;
        case 'gt':
          return (value as any) > compareValue;
        case 'gte':
          return (value as any) >= compareValue;
        case 'lt':
          return (value as any) < compareValue;
        case 'lte':
          return (value as any) <= compareValue;
        default:
          return false;
      }
    }
    case 'object': {
      // Handle nested object filters for property matching
      if (typeof value !== 'object' || value === null) {
        return false;
      }

      // Check properties
      if (filter.props) {
        for (const [key, valueFilter] of Object.entries(filter.props)) {
          const nestedValue = (value as any)[key];
          if (!filterMatchValue(valueFilter, nestedValue)) {
            return false;
          }
        }
      }

      return true;
    }
    case 'in': {
      return filter.values.includes(value);
    }
    case 'contains': {
      if (!Array.isArray(value)) {
        return false;
      }

      return value.some((element) => {
        if (typeof filter.value === 'object' && filter.value !== null && !Array.isArray(filter.value)) {
          return structuralMatch(filter.value, element);
        }

        return element === filter.value;
      });
    }
    case 'range': {
      return (value as any) >= filter.from && (value as any) <= filter.to;
    }
    case 'not': {
      return !filterMatchValue(filter.filter, value);
    }
    case 'and': {
      return filter.filters.every((f) => filterMatchValue(f, value));
    }
    case 'or': {
      return filter.filters.some((f) => filterMatchValue(f, value));
    }
    default:
      return false;
  }
};

/**
 * Compares a filter's type discriminator (`expectedStr`) against the value stored on an object's
 * `system.type` (`actualStr`).
 *
 * - `echo:` EIDs match by entity id; a bare (space-less) id matches the object in any space, while
 *   a space-qualified id matches only that space.
 * - `dxn:` DXNs match version-agnostically (a missing version on either side matches any version).
 * - Any other string is compared verbatim.
 */
const compareTypenameStrings = (expectedStr: string, actualStr: string): boolean => {
  const expectedEid = EID.tryParse(expectedStr);
  if (expectedEid) {
    const actualEid = EID.tryParse(actualStr);
    if (!actualEid) return false;
    if (EID.getEntityId(expectedEid) !== EID.getEntityId(actualEid)) return false;
    const expectedSpaceId = EID.getSpaceId(expectedEid);
    const actualSpaceId = EID.getSpaceId(actualEid);
    return expectedSpaceId === undefined || actualSpaceId === undefined || expectedSpaceId === actualSpaceId;
  }

  const expectedDxn = DXN.tryMake(expectedStr);
  if (expectedDxn) {
    const actualDxn = DXN.tryMake(actualStr);
    if (!actualDxn) return false;
    if (DXN.getName(expectedDxn) !== DXN.getName(actualDxn)) return false;
    const expectedVersion = DXN.getVersion(expectedDxn);
    const actualVersion = DXN.getVersion(actualDxn);
    return expectedVersion === undefined || actualVersion === undefined || expectedVersion === actualVersion;
  }

  return expectedStr === actualStr;
};
