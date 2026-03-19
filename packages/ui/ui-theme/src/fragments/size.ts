//
// Copyright 2022 DXOS.org
//

import { type CSSProperties } from 'react';

import { type Size } from '@dxos/ui-types';

import { mx } from '../util';

// NOTE: Class names must be fully-specified string literals so Tailwind's static scanner can detect them.
const sizeMap: Record<string, { w: string; h: string }> = {
  0: { w: 'w-0', h: 'h-0' },
  px: { w: 'w-px', h: 'h-px' },
  0.5: { w: 'w-0.5', h: 'h-0.5' },
  1: { w: 'w-1', h: 'h-1' },
  1.5: { w: 'w-1.5', h: 'h-1.5' },
  2: { w: 'w-2', h: 'h-2' },
  2.5: { w: 'w-2.5', h: 'h-2.5' },
  3: { w: 'w-3', h: 'h-3' },
  3.5: { w: 'w-3.5', h: 'h-3.5' },
  4: { w: 'w-4', h: 'h-4' },
  5: { w: 'w-5', h: 'h-5' },
  6: { w: 'w-6', h: 'h-6' },
  7: { w: 'w-7', h: 'h-7' },
  8: { w: 'w-8', h: 'h-8' },
  9: { w: 'w-9', h: 'h-9' },
  10: { w: 'w-10', h: 'h-10' },
  11: { w: 'w-11', h: 'h-11' },
  12: { w: 'w-12', h: 'h-12' },
  14: { w: 'w-14', h: 'h-14' },
  16: { w: 'w-16', h: 'h-16' },
  20: { w: 'w-20', h: 'h-20' },
  24: { w: 'w-24', h: 'h-24' },
  28: { w: 'w-28', h: 'h-28' },
  32: { w: 'w-32', h: 'h-32' },
  36: { w: 'w-36', h: 'h-36' },
  40: { w: 'w-40', h: 'h-40' },
  44: { w: 'w-44', h: 'h-44' },
  48: { w: 'w-48', h: 'h-48' },
  52: { w: 'w-52', h: 'h-52' },
  56: { w: 'w-56', h: 'h-56' },
  60: { w: 'w-60', h: 'h-60' },
  64: { w: 'w-64', h: 'h-64' },
  72: { w: 'w-72', h: 'h-72' },
  80: { w: 'w-80', h: 'h-80' },
  96: { w: 'w-96', h: 'h-96' },
};

const SIZE_VALUES: Size[] = Object.keys(sizeMap).map((key) => (key === 'px' ? 'px' : (Number(key) as Size)));

export const getHeight = (size: Size) => sizeMap[size]?.h;
export const getWidth = (size: Size) => sizeMap[size]?.w;
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
