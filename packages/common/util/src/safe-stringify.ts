//
// Copyright 2025 DXOS.org
//

export const SKIP = Object.freeze({});

export type StringifyReplacer = (key: string, value: any) => typeof SKIP | any;

export function safeStringify(obj: any, filter: StringifyReplacer = defaultFilter, indent = 2) {
  const seen = new WeakMap<object, string>();

  // NOTE: Called for the root object with undefined key.
  function replacer(this: any, key: string, value: any) {
    let path = key;
    if (!key) {
      path = '$';
    } else if (this) {
      const parentPath = seen.get(this);
      path = parentPath ? `${parentPath}.${key}` : key;
    }

    if (typeof value === 'function') {
      return undefined;
    }

    if (typeof value === 'object' && value !== null) {
      const exists = seen.get(value);
      if (exists) {
        return `[${path} => ${exists}]`;
      }

      seen.set(value, path);
    }

    if (filter) {
      const v2 = filter?.(key, value);
      if (v2 !== undefined) {
        return v2 === SKIP ? undefined : v2;
      }
    }

    return value;
  }

  try {
    const str = JSON.stringify(obj, replacer, indent);
    return str;
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}

export type CreateReplacerProps = {
  omit?: string[];
  parse?: string[];
  maxDepth?: number;
  maxArrayLen?: number;
  maxStringLen?: number;
};

export const createReplacer = ({
  omit,
  parse,
  maxDepth,
  maxArrayLen,
  maxStringLen,
}: CreateReplacerProps = {}): StringifyReplacer => {
  let currentDepth = 0;
  const depthMap = new WeakMap<object, number>();

  return function (this: any, key: string, value: any) {
    // Track depth.
    if (key === '') {
      // Root.
      currentDepth = 0;
    } else if (this && typeof this === 'object') {
      const parentDepth = depthMap.get(this) ?? 0;
      currentDepth = parentDepth + 1;
    }

    if (typeof value === 'function') {
      return undefined;
    }

    // Store depth for this object.
    if (value && typeof value === 'object') {
      depthMap.set(value, currentDepth);

      // Check max depth.
      if (maxDepth != null && currentDepth >= maxDepth) {
        return Array.isArray(value) ? `[{ length: ${value.length} }]` : `{ keys: ${Object.keys(value).length} }`;
      }
    }

    // Apply other filters.
    if (omit?.includes(key)) {
      return undefined;
    }

    if (parse?.includes(key) && typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    if (maxArrayLen != null && Array.isArray(value) && value.length > maxArrayLen) {
      return `[length: ${value.length}]`;
    }

    if (maxStringLen != null && typeof value === 'string' && value.length > maxStringLen) {
      return value.slice(0, maxStringLen) + '...';
    }

    return value;
  };
};

export const defaultFilter: StringifyReplacer = createReplacer();
