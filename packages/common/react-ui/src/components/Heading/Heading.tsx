//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { createElement, PropsWithChildren } from 'react';

export interface HeadingProps extends React.ComponentProps<'h1'> {
  level?: 1 | 2 | 3 | 4 | 5 | 6
}

const levelClassNameMap = new Map<number, string>([
  [1, 'text-5xl'],
  [2, 'text-4xl'],
  [3, 'text-3xl'],
  [4, 'text-2xl'],
  [5, 'text-xl'],
  [6, 'text-lg']
]);

export const Heading = ({ level, ...props }: PropsWithChildren<HeadingProps>) => {
  const resolvedLevel = level || 1;
  return createElement(`h${resolvedLevel}`, { ...props, className: cx('font-bold font-display', levelClassNameMap.get(resolvedLevel), props.className) });
};
