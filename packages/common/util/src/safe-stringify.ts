//
// Copyright 2025 DXOS.org
//

export const SKIP = Object.freeze({});

/**
 * JSON.stringify replacer function.
 */
export type StringifyReplacer = (key: string, value: any) => typeof SKIP | any;

/**
 * Safely stringifies an object.
 */
export function safeStringify(obj: any, filter: StringifyReplacer = defaultFilter, indent = 2) {
  const seen = new WeakMap<object, string>();

  // NOTE: Called for the root object with undefined key.
  function replacer(this: any, key: string, value: any) {
    try {
      let path = key;
      if (!key) {
        path = '$';
        return value;
      } else if (this) {
        const parentPath = seen.get(this);
        path = parentPath ? `${parentPath}.${key}` : key;
      }

      // Null or undefined.
      if (value == null) {
        return value;
      }

      // Ignore functions.
      if (typeof value === 'function') {
        return undefined;
      }

      // Ignore exotic objects (non-plain objects like DOM elements, class instances, etc.)
      if (typeof value === 'object' && Object.getPrototypeOf(value) !== Object.prototype) {
        return undefined;
      }

      // Check cycles.
      if (typeof value === 'object' && value !== null) {
        const exists = seen.get(value);
        if (exists) {
          return `[${path} => ${exists}]`;
        }

        seen.set(value, path);
      }

      if (filter) {
        const filteredValue = filter?.(key, value);
        if (filteredValue !== undefined) {
          return filteredValue === SKIP ? undefined : filteredValue;
        }
      }

      return value;
    } catch (error: any) {
      return `ERROR: ${error.message}`;
    }
  }

  return JSON.stringify(obj, replacer, indent);
}

export type CreateReplacerProps = {
  omit?: string[];
  parse?: string[]; // TODO(burdon): Parse JSON value.
  maxDepth?: number;
  maxArrayLen?: number;
  maxStringLen?: number;
};

/**
 * Construct JSON.stringify replacer.
 */
// TODO(burdon): Change to composite effect.
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

    // Skip functions.
    if (typeof value === 'function') {
      return SKIP;
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
      return SKIP;
    }

    // Parse JSON values.
    if (parse?.includes(key) && typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    // Show array length.
    if (maxArrayLen != null && Array.isArray(value) && value.length > maxArrayLen) {
      return `[length: ${value.length}]`;
    }

    // Truncate strings.
    if (maxStringLen != null && typeof value === 'string' && value.length > maxStringLen) {
      return value.slice(0, maxStringLen) + '...';
    }

    return value;
  };
};

export const defaultFilter: StringifyReplacer = createReplacer();
