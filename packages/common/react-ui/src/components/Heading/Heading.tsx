//
// Copyright 2022 DXOS.org
//

import React, { createElement, PropsWithChildren, ReactNode } from 'react';

import { mx } from '../../util';

export interface HeadingProps extends React.ComponentProps<'h1'> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children?: ReactNode;
}

const levelClassNameMap = new Map<number, string>([
  [1, 'text-5xl'],
  [2, 'text-4xl'],
  [3, 'text-3xl'],
  [4, 'text-2xl'],
  [5, 'text-xl'],
  [6, 'text-lg']
]);

export const Heading = ({ level, ...rootSlot }: PropsWithChildren<HeadingProps>) => {
  const resolvedLevel = level || 1;
  return createElement(`h${resolvedLevel}`, {
    ...rootSlot,
    className: mx('font-bold font-display', levelClassNameMap.get(resolvedLevel), rootSlot.className)
  });
};
