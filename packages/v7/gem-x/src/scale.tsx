//
// Copyright 2020 DXOS.org
//

import { useMemo } from 'react';

import { Frac, Num } from './frac';

export class Scale {
  constructor (
    private readonly _gridSize: number
  ) {}

  get gridSize () {
    return this._gridSize;
  }

  x (n: number | Num) {
    return Frac.floor(Frac.x(n, this._gridSize));
  }
}

export const defaultScale = new Scale(32);

export const useScale = ({ gridSize }): Scale => {
  return useMemo<Scale>(() => new Scale(gridSize), []);
}
