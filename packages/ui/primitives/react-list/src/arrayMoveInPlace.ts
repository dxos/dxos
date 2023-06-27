//
// Copyright 2023 DXOS.org
//

export const arrayMoveInPlace = <T>(array: Array<T>, from: number, to: number) => {
  return array.splice(to < 0 ? array.length + to : to, 0, array.splice(from, 1)[0]);
};
