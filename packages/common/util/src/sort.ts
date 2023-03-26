//
// Copyright 2023 DXOS.org
//

export const alphabetical =
  <T extends { [key: string]: string }>(key: string, direction = 1) =>
  (v1: T, v2: T) => {
    const a = v1[key]?.toLowerCase();
    const b = v2[key]?.toLowerCase();
    return a < b ? direction * -1 : a > b ? direction : 0;
  };
