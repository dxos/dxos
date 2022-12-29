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
