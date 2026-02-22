//
// Copyright 2022 DXOS.org
//

import { type Size } from '@dxos/ui-types';

import { mx } from '../../util';

export const sizeWidthMap = new Map<Size, string>([
  [0, 'inline-0'],
  ['px', 'is-px'], // 1px
  [0.5, 'inline-0.5'],
  [1, 'inline-1'],
  [1.5, 'inline-1.5'],
  [2, 'inline-2'],
  [2.5, 'inline-2.5'],
  [3, 'inline-3'],
  [3.5, 'inline-3.5'],
  [4, 'inline-4'],
  [5, 'inline-5'],
  [6, 'inline-6'],
  [7, 'inline-7'],
  [8, 'inline-8'],
  [9, 'inline-9'],
  [10, 'inline-10'],
  [11, 'inline-11'],
  [12, 'inline-12'],
  [14, 'inline-14'],
  [16, 'inline-16'],
  [20, 'inline-20'],
  [24, 'inline-24'],
  [28, 'inline-28'],
  [32, 'inline-32'],
  [36, 'inline-36'],
  [40, 'inline-40'],
  [44, 'inline-44'],
  [48, 'inline-48'],
  [52, 'inline-52'],
  [56, 'inline-56'],
  [60, 'inline-60'],
  [64, 'inline-64'],
  [72, 'inline-72'],
  [80, 'inline-80'],
  [96, 'inline-96'],
]);

export const sizeHeightMap = new Map<Size, string>([
  [0, 'block-0'],
  ['px', 'bs-px'], // 1px
  [0.5, 'block-0.5'],
  [1, 'block-1'],
  [1.5, 'block-1.5'],
  [2, 'block-2'],
  [2.5, 'block-2.5'],
  [3, 'block-3'],
  [3.5, 'block-3.5'],
  [4, 'block-4'],
  [5, 'block-5'],
  [6, 'block-6'],
  [7, 'block-7'],
  [8, 'block-8'],
  [9, 'block-9'],
  [10, 'block-10'],
  [11, 'block-11'],
  [12, 'block-12'],
  [14, 'block-14'],
  [16, 'block-16'],
  [20, 'block-20'],
  [24, 'block-24'],
  [28, 'block-28'],
  [32, 'block-32'],
  [36, 'block-36'],
  [40, 'block-40'],
  [44, 'block-44'],
  [48, 'block-48'],
  [52, 'block-52'],
  [56, 'block-56'],
  [60, 'block-60'],
  [64, 'block-64'],
  [72, 'block-72'],
  [80, 'block-80'],
  [96, 'block-96'],
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
