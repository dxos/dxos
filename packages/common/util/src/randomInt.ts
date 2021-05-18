//
// Copyright 2021 DXOS.org
//

export const randomInt = (max: number, min: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
