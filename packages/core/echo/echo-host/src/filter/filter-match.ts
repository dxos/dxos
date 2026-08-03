//
// Copyright 2025 DXOS.org
//

import { EntityStructure, type QueryAST } from '@dxos/echo-protocol';
import {
  ATTR_META,
  type ObjectJSON,
  compareTypenameStrings,
  filterMatchEntity,
  filterMatchValue,
  matchesTag,
  matchMetaKey,
} from '@dxos/echo/internal';
import { EntityId, SpaceId } from '@dxos/keys';

export { filterMatchEntity, filterMatchValue };

export type MatchedDoc = {
  id: EntityId;
  spaceId: SpaceId;
  doc: EntityStructure;
};

/**
 * Matches an object against a filter AST.
 * @param obj object structure as stored in automerge.
 */
export const filterMatchDoc = (filter: QueryAST.Filter, obj: MatchedDoc): boolean => {
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

    case 'in-query': {
      throw new Error('in-query filters must be resolved to a literal `in` by the query executor before matching.');
    }

    case 'not': {
      return !filterMatchDoc(filter.filter, obj);
    }

    case 'and': {
      return filter.filters.every((f) => filterMatchDoc(f, obj));
    }

    case 'or': {
      return filter.filters.some((f) => filterMatchDoc(f, obj));
    }

    default:
      return false;
  }
};

// TODO(burdon): Reconcile with filterMatchDoc (automerge doc path).
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

    case 'in-query': {
      throw new Error('in-query filters must be resolved to a literal `in` by the query executor before matching.');
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
