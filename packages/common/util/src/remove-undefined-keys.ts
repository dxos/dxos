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
