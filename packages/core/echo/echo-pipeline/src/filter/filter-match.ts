//
// Copyright 2025 DXOS.org
//

import { decodeReference, isEncodedReference, type QueryAST, type ObjectStructure } from '@dxos/echo-protocol';
import { EXPANDO_TYPENAME } from '@dxos/echo-schema';
import { DXN, type ObjectId, type SpaceId } from '@dxos/keys';

export type MatchedObject = {
  id: ObjectId;
  spaceId: SpaceId;
  doc: ObjectStructure;
};

/**
 * Matches an object against a filter AST.
 */
export const filterMatchObject = (filter: QueryAST.Filter, obj: MatchedObject): boolean => {
  switch (filter.type) {
    case 'object': {
      // Check typename if specified
      if (filter.typename !== null) {
        // TODO(dmaretskyi): `system` is missing in some cases.
        if (!obj.doc.system?.type?.['/']) {
          // Objects with no type are considered to be expando objects
          const expectedDXN = DXN.parse(filter.typename).asTypeDXN();
          if (expectedDXN?.type !== EXPANDO_TYPENAME) {
            return false;
          }
        } else {
          const actualDXN = DXN.parse(obj.doc.system.type['/']);
          const expectedDXN = DXN.parse(filter.typename);

          if (!compareTypename(expectedDXN, actualDXN)) {
            return false;
          }
        }
      }

      // Check IDs if specified
      if (filter.id && filter.id.length > 0 && !filter.id.includes(obj.id)) {
        return false;
      }

      // Check properties
      if (filter.props) {
        for (const [key, valueFilter] of Object.entries(filter.props)) {
          const value = obj.doc.data[key];
          if (!filterMatchValue(valueFilter, value)) {
            return false;
          }
        }
      }

      // Check foreign keys if specified
      if (filter.foreignKeys && filter.foreignKeys.length > 0) {
        const hasMatchingKey = filter.foreignKeys.some((filterKey) =>
          obj.doc.meta.keys.some((objKey) => objKey.source === filterKey.source && objKey.id === filterKey.id),
        );
        if (!hasMatchingKey) {
          return false;
        }
      }

      return true;
    }

    case 'text-search': {
      // TODO: Implement text search
      return false;
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
            return DXN.equals(decodeReference(value).toDXN(), decodeReference(compareValue).toDXN());
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
      }
      break;
    }
    case 'in': {
      return filter.values.includes(value);
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
 * Compares typename DXNs.
 * @returns true if they match
 *
 * Compares typename string.
 * Missing version (on either actual or expected) matches any version.
 * non `type` DXNs are compared exactly.
 *
 * Examples: (expected) (actual)
 *
 * dxn:type:example.org/type/Task       !== dxn:type:example.org/type/Contact
 * dxn:type:example.org/type/Task       === dxn:type:example.org/type/Task
 * dxn:type:example.org/type/Task:0.1.0 !== dxn:type:example.org/type/Task:0.2.0
 * dxn:type:example.org/type/Task       === dxn:type:example.org/type/Task:0.1.0
 * dxn:type:example.org/type/Task:0.1.0 === dxn:type:example.org/type/Task
 *
 */
const compareTypename = (expectedDXN: DXN, actualDXN: DXN): boolean => {
  const expectedTypeDXN = expectedDXN.asTypeDXN();
  if (expectedTypeDXN) {
    const actualTypeDXN = actualDXN.asTypeDXN();
    if (!actualTypeDXN) {
      return false;
    }
    if (
      actualTypeDXN.type !== expectedTypeDXN.type ||
      (expectedTypeDXN.version !== undefined &&
        actualTypeDXN.version !== undefined &&
        actualTypeDXN.version !== expectedTypeDXN.version)
    ) {
      return false;
    }
  } else {
    if (!DXN.equals(actualDXN, expectedDXN)) {
      return false;
    }
  }
  return true;
};
