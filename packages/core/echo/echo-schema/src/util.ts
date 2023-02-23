//
// Copyright 2022 DXOS.org
//

/**
 * Remove keys with undefined values.
 */
export const strip = (obj: any): any => {
  if (typeof obj === 'object') {
    Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key]);
  }

  return obj;
};

export const isReferenceLike = (value: any): value is { '@id': string } =>
  typeof value === 'object' &&
  value !== null &&
  Object.getOwnPropertyNames(value).length === 1 &&
  typeof (value as any)['@id'] === 'string';
