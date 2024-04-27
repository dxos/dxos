//
// Copyright 2024 DXOS.org
//

export const defineHiddenProperty = (object: any, key: string | symbol, value: any) => {
  Object.defineProperty(object, key, {
    enumerable: false,
    configurable: true,
    value,
  });
};
