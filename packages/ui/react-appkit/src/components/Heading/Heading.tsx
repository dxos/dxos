//
// Copyright 2022 DXOS.org
//

import type React from 'react';
import { type PropsWithChildren, type ReactNode } from 'react';
import { createElement } from 'react';

import { mx } from '@dxos/react-ui-theme';

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
  [6, 'text-lg'],
]);

export const Heading = ({ level, ...rootSlot }: PropsWithChildren<HeadingProps>) => {
  const resolvedLevel = level || 1;
  return createElement(`h${resolvedLevel}`, {
    ...rootSlot,
    className: mx('font-system-bold', levelClassNameMap.get(resolvedLevel), rootSlot.className),
  });
};
