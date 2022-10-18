//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { PropsWithChildren } from 'react';

import { useId } from '../../util/useId';
import { Heading, HeadingProps } from '../Heading/Heading';

export interface GroupProps extends React.ComponentProps<'div'> {
  label: HeadingProps
  labelVisuallyHidden?: boolean
  elevation?: 1 | 2 | 3 | 4 | 5 | 6
}

const elevationClassNameMap = new Map<number, string>([
  [1, 'shadow-sm'],
  [2, 'shadow'],
  [3, 'shadow-md'],
  [4, 'shadow-lg'],
  [5, 'shadow-xl'],
  [6, 'shadow-2xl']
]);

export const Group = ({
  elevation,
  children,
  label,
  labelVisuallyHidden,
  className,
  ...props
}: PropsWithChildren<GroupProps>) => {
  const labelId = useId('groupLabel');
  return (
    <div
      role='group' aria-labelledby={labelId}
      className={cx('bg-white dark:bg-neutral-800 rounded-lg p-4 elevated-buttons', elevationClassNameMap.get(elevation || 3), className)} {...props}>
      <Heading
        {...label}
        id={labelId}
        className={cx(labelVisuallyHidden && 'sr-only', 'mb-2', label?.className)}
      />
      {children}
    </div>
  );
};
