//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { ReactNode } from 'react';

import { useId } from '../../hooks';
import { Heading, HeadingProps } from '../Heading';

export interface GroupProps extends React.ComponentProps<'div'> {
  label: HeadingProps;
  labelVisuallyHidden?: boolean;
  elevation?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  children?: ReactNode;
}

const elevationClassNameMap = new Map<number, string>([
  [0, 'shadow-none'],
  [1, 'shadow-sm'],
  [2, 'shadow'],
  [3, 'shadow-md'],
  [4, 'shadow-lg'],
  [5, 'shadow-xl'],
  [6, 'shadow-2xl']
]);

export const Group = ({ elevation, children, label, labelVisuallyHidden, className, ...props }: GroupProps) => {
  const labelId = useId('groupLabel');
  return (
    <div
      role='group'
      aria-labelledby={labelId}
      className={cx(
        'rounded-lg p-4',
        elevation === 0
          ? 'bg-transparent border border-neutral-200 dark:border-neutral-700'
          : 'bg-white dark:bg-neutral-800 elevated-buttons',
        elevationClassNameMap.get(typeof elevation === 'undefined' ? 3 : elevation),
        className
      )}
      {...props}
    >
      <Heading {...label} id={labelId} className={cx(labelVisuallyHidden && 'sr-only', 'mb-2', label?.className)} />
      {children}
    </div>
  );
};
