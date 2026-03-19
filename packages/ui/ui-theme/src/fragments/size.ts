//
// Copyright 2022 DXOS.org
//

import { type CSSProperties } from 'react';

import { type Size } from '@dxos/ui-types';

import { mx } from '../util';

const SIZE_VALUES: Size[] = [
  0,
  'px',
  0.5,
  1,
  1.5,
  2,
  2.5,
  3,
  3.5,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  14,
  16,
  20,
  24,
  28,
  32,
  36,
  40,
  44,
  48,
  52,
  56,
  60,
  64,
  72,
  80,
  96,
];

const sizeMap = new Map<Size, { w: string; h: string }>(
  SIZE_VALUES.map((size) => {
    const suffix = size === 'px' ? 'px' : size;
    return [size, { w: `w-${suffix}`, h: `h-${suffix}` }];
  }),
);

export const getHeight = (size: Size) => sizeMap.get(size)?.h;
export const getWidth = (size: Size) => sizeMap.get(size)?.w;
export const getSize = (size: Size) => mx(getHeight(size), getWidth(size));

export const sizeValue = (size: Size): number => (size === 'px' ? 1 : size);
export const sizeToRem = (size: Size): string => (size === 'px' ? '1px' : `${(size as number) * 0.25}rem`);

export const iconSize = (size: Size | null): CSSProperties =>
  ({ '--icon-size': size ? sizeToRem(size) : 'initial' }) as CSSProperties;

export const computeSize = (value: number, defaultSize: Size) => {
  if (SIZE_VALUES.includes(value as Size)) {
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
    if (SIZE_VALUES.includes(halfSeries as Size)) {
      return halfSeries as Size;
    } else if (SIZE_VALUES.includes(wholeSeries as Size)) {
      return wholeSeries as Size;
    } else if (SIZE_VALUES.includes(doubleSeries as Size)) {
      return doubleSeries as Size;
    } else if (SIZE_VALUES.includes(quadrupleSeries as Size)) {
      return quadrupleSeries as Size;
    } else {
      return defaultSize;
    }
  }
};
