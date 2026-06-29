//
// Copyright 2026 DXOS.org
//

import * as semver from 'semver';

import { type QueryAST, EncodedReference, isEncodedReference } from '@dxos/echo-protocol';
import { DXN, EID } from '@dxos/keys';

import { getTypeURI } from '../Annotation/annotations';
import { getMetaChecked } from '../common/api/meta';
import { type AnyEntity } from '../common/types';
import { objectToJSON } from '../Obj/json-serializer';

/**
 * Matches a tag filter against an object's stored tags. Tags may be stored as encoded references or
 * (in legacy data) bare URI strings, and those URIs may be in legacy DXN form. Both sides are
 * normalized to the canonical EID before comparing.
 */
export const matchesTag = (tags: readonly unknown[], filterTag: string): boolean => {
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
 * Matches a meta `key` / `version` constraint against an object's meta `key` and `version`.
 */
export const matchMetaKey = (
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

/**
 * Compares a filter's type discriminator against the value stored on an object's `system.type`.
 */
export const compareTypenameStrings = (expectedStr: string, actualStr: string): boolean => {
  const expectedEid = EID.tryParse(expectedStr);
  if (expectedEid) {
    const actualEid = EID.tryParse(actualStr);
    if (!actualEid) {
      return false;
    }
    if (EID.getEntityId(expectedEid) !== EID.getEntityId(actualEid)) {
      return false;
    }
    const expectedSpaceId = EID.getSpaceId(expectedEid);
    const actualSpaceId = EID.getSpaceId(actualEid);
    return expectedSpaceId === undefined || actualSpaceId === undefined || expectedSpaceId === actualSpaceId;
  }

  const expectedDxn = DXN.tryMake(expectedStr);
  if (expectedDxn) {
    const actualDxn = DXN.tryMake(actualStr);
    if (!actualDxn) {
      return false;
    }
    if (DXN.getName(expectedDxn) !== DXN.getName(actualDxn)) {
      return false;
    }
    const expectedVersion = DXN.getVersion(expectedDxn);
    const actualVersion = DXN.getVersion(actualDxn);
    return expectedVersion === undefined || actualVersion === undefined || expectedVersion === actualVersion;
  }

  return expectedStr === actualStr;
};

const structuralMatch = (filterObj: any, targetObj: any, strict = true): boolean => {
  if (typeof filterObj !== 'object' || filterObj === null) {
    return filterObj === targetObj;
  }

  if (typeof targetObj !== 'object' || targetObj === null) {
    return false;
  }

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
      if (typeof value !== 'object' || value === null) {
        return false;
      }

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
 * Matches a filter against an entity proxy without full JSON serialization when possible.
 */
export const filterMatchEntity = (filter: QueryAST.Filter, entity: AnyEntity): boolean => {
  switch (filter.type) {
    case 'object': {
      if (filter.typename !== null) {
        const typeURI = getTypeURI(entity);
        if (!typeURI || !compareTypenameStrings(filter.typename, typeURI)) {
          return false;
        }
      }

      if (filter.id && filter.id.length > 0 && !filter.id.includes(entity.id)) {
        return false;
      }

      if (filter.props) {
        let json: ReturnType<typeof objectToJSON> | null = null;
        try {
          json = objectToJSON(entity);
        } catch {
          // Serialization of complex static-type entities may throw.
        }
        if (json === null) {
          return false;
        }
        for (const [key, valueFilter] of Object.entries(filter.props)) {
          if (key.startsWith('@')) {
            continue;
          }
          if (!filterMatchValue(valueFilter, (json as any)[key])) {
            return false;
          }
        }
      }

      const meta = getMetaChecked(entity);

      if (filter.foreignKeys && filter.foreignKeys.length > 0) {
        const hasKey = filter.foreignKeys.some((fk) => meta.keys.some((k) => k.source === fk.source && k.id === fk.id));
        if (!hasKey) {
          return false;
        }
      }

      if (filter.metaKey !== undefined) {
        if (!matchMetaKey(filter.metaKey, filter.metaVersion, meta.key, meta.version)) {
          return false;
        }
      }

      return true;
    }

    case 'tag': {
      const rawTags = getMetaChecked(entity).tags;
      const tags = rawTags.map((tag: any) => (typeof tag?.encode === 'function' ? tag.encode() : tag));
      return matchesTag(tags, filter.tag);
    }

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
      return !filterMatchEntity(filter.filter, entity);
    }

    case 'and': {
      return filter.filters.every((f) => filterMatchEntity(f, entity));
    }

    case 'or': {
      return filter.filters.some((f) => filterMatchEntity(f, entity));
    }

    default:
      return false;
  }
};
