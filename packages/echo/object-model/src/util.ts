//
// Copyright 2020 DXOS.org
//

/**
 * Keys must be valid object keys or dot s
 */
export const validateKey = (key: string) => {
  const parts = key.split('.');
  const valid = parts.every((part: string) => part.match(/^\w+$/));
  if (!valid) {
    throw new Error(`Invalid key: ${key}`);
  }

  return key;
};

/**
 * Removes the potentially nested property.
 */
export const removeKey = (object: any, key: string) => {
  const parts = key.split('.');

  let sub = object;
  if (parts.length > 1) {
    for (let i = 0; i < parts.length; i++) {
      const key = parts[i];
      if (i === parts.length - 1) {
        delete sub[key!];
      } else {
        sub = sub[key];
      }
    }
  } else {
    delete object[key];
  }

  return object;
};
