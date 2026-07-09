//
// Copyright 2025 DXOS.org
//

export const mergeFloat64Arrays = (arrays: Float64Array[]) => {
  const newArray = new Float64Array(arrays.reduce((acc, array) => array.length + acc, 0));
  let offset = 0;
  for (const array of arrays) {
    newArray.set(array, offset);
    offset += array.length;
  }

  return newArray;
};
