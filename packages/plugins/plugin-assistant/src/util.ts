//
// Copyright 2025 DXOS.org
//

export const SKIP = Object.freeze({});

export type StringifyReplacer = (key: string, value: any) => typeof SKIP | any;

export function safeStringify(obj: any, indent = 2, filter: StringifyReplacer = defaultFilter) {
  const seen = new WeakSet();
  function replacer(key: string, value: any) {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }

      seen.add(value);
    }

    if (filter) {
      const v2 = filter?.(key, value);
      if (v2 !== undefined) {
        return v2 === SKIP ? undefined : v2;
      }
    }

    return value;
  }

  let result = '';
  try {
    result = JSON.stringify(obj, replacer, indent);
  } catch (error: any) {
    result = `Error: ${error.message}`;
  }

  return result;
}

export const defaultFilter: StringifyReplacer = (key, value) => {
  if (typeof value === 'function') {
    return SKIP;
  }

  if (key.startsWith('_')) {
    return SKIP;
  }
};
