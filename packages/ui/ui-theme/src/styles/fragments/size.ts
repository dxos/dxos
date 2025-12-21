//
// Copyright 2022 DXOS.org
//

import { type Size } from '@dxos/ui-types';

import { mx } from '../../util';

export const sizeWidthMap = new Map<Size, string>([
  [0, 'is-0'],
  ['px', 'is-px'],
  [0.5, 'is-0.5'],
  [1, 'is-1'],
  [1.5, 'is-1.5'],
  [2, 'is-2'],
  [2.5, 'is-2.5'],
  [3, 'is-3'],
  [3.5, 'is-3.5'],
  [4, 'is-4'],
  [5, 'is-5'],
  [6, 'is-6'],
  [7, 'is-7'],
  [8, 'is-8'],
  [9, 'is-9'],
  [10, 'is-10'],
  [11, 'is-11'],
  [12, 'is-12'],
  [14, 'is-14'],
  [16, 'is-16'],
  [20, 'is-20'],
  [24, 'is-24'],
  [28, 'is-28'],
  [32, 'is-32'],
  [36, 'is-36'],
  [40, 'is-40'],
  [44, 'is-44'],
  [48, 'is-48'],
  [52, 'is-52'],
  [56, 'is-56'],
  [60, 'is-60'],
  [64, 'is-64'],
  [72, 'is-72'],
  [80, 'is-80'],
  [96, 'is-96'],
]);

export const sizeHeightMap = new Map<Size, string>([
  [0, 'bs-0'],
  ['px', 'bs-px'],
  [0.5, 'bs-0.5'],
  [1, 'bs-1'],
  [1.5, 'bs-1.5'],
  [2, 'bs-2'],
  [2.5, 'bs-2.5'],
  [3, 'bs-3'],
  [3.5, 'bs-3.5'],
  [4, 'bs-4'],
  [5, 'bs-5'],
  [6, 'bs-6'],
  [7, 'bs-7'],
  [8, 'bs-8'],
  [9, 'bs-9'],
  [10, 'bs-10'],
  [11, 'bs-11'],
  [12, 'bs-12'],
  [14, 'bs-14'],
  [16, 'bs-16'],
  [20, 'bs-20'],
  [24, 'bs-24'],
  [28, 'bs-28'],
  [32, 'bs-32'],
  [36, 'bs-36'],
  [40, 'bs-40'],
  [44, 'bs-44'],
  [48, 'bs-48'],
  [52, 'bs-52'],
  [56, 'bs-56'],
  [60, 'bs-60'],
  [64, 'bs-64'],
  [72, 'bs-72'],
  [80, 'bs-80'],
  [96, 'bs-96'],
]);

const sizes = new Set(sizeWidthMap.keys());

export const getSizeHeight = sizeHeightMap.get.bind(sizeHeightMap);
export const getSizeWidth = sizeWidthMap.get.bind(sizeWidthMap);
export const getSize = (size: Size) => mx(getSizeHeight(size), getSizeWidth(size));

export const computeSize = (value: number, defaultSize: Size) => {
  if (sizes.has(value as Size)) {
    return value as Size;
  } else if (value <= 0) {
    return 0;
  } else if (value === 1) {
    return 'px';
  } else {
    const wholeSeries = Math.floor(value);
    const halfSeries = Math.floor(value * 2) / 2;
    const doubleSeries = Math.floor(value / 2) * 2;
    const quadrupleSeries = Math.floor(value / 4) * 4;
    if (sizes.has(halfSeries as Size)) {
      return halfSeries as Size;
    } else if (sizes.has(wholeSeries as Size)) {
      return wholeSeries as Size;
    } else if (sizes.has(doubleSeries as Size)) {
      return doubleSeries as Size;
    } else if (sizes.has(quadrupleSeries as Size)) {
      return quadrupleSeries as Size;
    } else {
      return defaultSize;
    }
  }
};

export const sizeValue = (size: Size): number => (size === 'px' ? 1 : size);
