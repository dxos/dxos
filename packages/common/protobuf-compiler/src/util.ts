//
// Copyright 2020 DXOS.org
//

export const getFlags = (enumType: any, flags: any) => {
  const res = [];
  for (const variant of Object.keys(enumType)) {
    if (typeof variant !== 'string') {
      continue;
    }
    if (enumType[variant] & flags) {
      res.push(variant);
    }
  }
  return res;
};
