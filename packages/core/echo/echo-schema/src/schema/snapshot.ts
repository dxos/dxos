//
// Copyright 2025 DXOS.org
//

/**
 * Returns a non-reactive snapshot of the given live object.
 */
// TODO(wittjosiah): Types.
export const getSnapshot = (object: any): any => {
  if (typeof object !== 'object') {
    return object;
  }

  if (Array.isArray(object)) {
    return object.map(getSnapshot);
  }

  const result: any = {};
  for (const key in object) {
    result[key] = getSnapshot(object[key]);
  }

  return result;
};
