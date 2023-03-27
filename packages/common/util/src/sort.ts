//
// Copyright 2023 DXOS.org
//

export const alphabetical = (direction = 1) => {
  return (v1: string, v2: string) => {
    const a = v1?.toLowerCase();
    const b = v2?.toLowerCase();
    return a < b ? direction * -1 : a > b ? direction : 0;
  };
};

// TODO(burdon): Specify array of keys.
export const alphabeticalByKey = <T extends { [key: string]: string }>(key: string, direction = 1) => {
  return (v1: T, v2: T) => {
    const a = v1[key]?.toLowerCase();
    const b = v2[key]?.toLowerCase();
    return a < b ? direction * -1 : a > b ? direction : 0;
  };
};
