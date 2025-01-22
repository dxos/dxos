//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Document.
export const defineHiddenProperty = (object: any, key: string | symbol, value: any) => {
  Object.defineProperty(object, key, {
    enumerable: false,
    configurable: true,
    value,
  });
};
