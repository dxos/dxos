//
// Copyright 2022 DXOS.org
//

import { type Size } from '@dxos/ui-types';

import { mx } from '../../util';

const sizeWidthMap = new Map<Size, string>([
  [0, 'w-0'],
  ['px', 'w-px'], // 1px
  [0.5, 'w-0.5'],
  [1, 'w-1'],
  [1.5, 'w-1.5'],
  [2, 'w-2'],
  [2.5, 'w-2.5'],
  [3, 'w-3'],
  [3.5, 'w-3.5'],
  [4, 'w-4'],
  [5, 'w-5'],
  [6, 'w-6'],
  [7, 'w-7'],
  [8, 'w-8'],
  [9, 'w-9'],
  [10, 'w-10'],
  [11, 'w-11'],
  [12, 'w-12'],
  [14, 'w-14'],
  [16, 'w-16'],
  [20, 'w-20'],
  [24, 'w-24'],
  [28, 'w-28'],
  [32, 'w-32'],
  [36, 'w-36'],
  [40, 'w-40'],
  [44, 'w-44'],
  [48, 'w-48'],
  [52, 'w-52'],
  [56, 'w-56'],
  [60, 'w-60'],
  [64, 'w-64'],
  [72, 'w-72'],
  [80, 'w-80'],
  [96, 'w-96'],
]);

const sizeHeightMap = new Map<Size, string>([
  [0, 'h-0'],
  ['px', 'h-px'], // 1px
  [0.5, 'h-0.5'],
  [1, 'h-1'],
  [1.5, 'h-1.5'],
  [2, 'h-2'],
  [2.5, 'h-2.5'],
  [3, 'h-3'],
  [3.5, 'h-3.5'],
  [4, 'h-4'],
  [5, 'h-5'],
  [6, 'h-6'],
  [7, 'h-7'],
  [8, 'h-8'],
  [9, 'h-9'],
  [10, 'h-10'],
  [11, 'h-11'],
  [12, 'h-12'],
  [14, 'h-14'],
  [16, 'h-16'],
  [20, 'h-20'],
  [24, 'h-24'],
  [28, 'h-28'],
  [32, 'h-32'],
  [36, 'h-36'],
  [40, 'h-40'],
  [44, 'h-44'],
  [48, 'h-48'],
  [52, 'h-52'],
  [56, 'h-56'],
  [60, 'h-60'],
  [64, 'h-64'],
  [72, 'h-72'],
  [80, 'h-80'],
  [96, 'h-96'],
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
