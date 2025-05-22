import { QueryAST, type ObjectStructure } from '@dxos/echo-protocol';
import type { ObjectId, SpaceId } from '@dxos/keys';

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
      if (filter.typename !== null && obj.doc.system.type?.['/'] !== filter.typename) {
        return false;
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
