//
// Copyright 2024 DXOS.org
//

export const removeUndefinedProperties = <T extends {}>(object: T): T => {
  for (const prop of [...Object.getOwnPropertyNames(object), ...Object.getOwnPropertySymbols(object)]) {
    if ((object as any)[prop] === undefined) {
      delete (object as any)[prop];
    }
  }

  return object;
};

type Test = string[] | ((key: string, value: any) => boolean);

/**
 * Recursively remove properties from the object, returning the modified object.
 */
export const removeProperties = (root: any, condition: Test): any => {
  if (!root || typeof root !== 'object') {
    return root;
  }

  if (Array.isArray(root)) {
    return root.map((item) => removeProperties(item, condition));
  }

  const result = { ...root };
  if (typeof condition === 'function') {
    for (const [key, value] of Object.entries(result)) {
      if (condition(key, value)) {
        delete result[key];
      }
    }
  } else {
    for (const key of condition) {
      delete result[key];
    }
  }

  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'object') {
      result[key] = removeProperties(value, condition);
    }
  }

  return result;
};
