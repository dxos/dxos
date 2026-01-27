//
// Copyright 2024 DXOS.org
//

/**
 * Define a non-enumerable property on an object.
 */
export const defineHiddenProperty = (object: any, key: string | symbol, value: any) => {
  Object.defineProperty(object, key, {
    enumerable: false,
    configurable: true,
    value,
  });
};
