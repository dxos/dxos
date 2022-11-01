//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { ReactNode } from 'react';

import { useId } from '../../hooks';
import { defaultGroup } from '../../styles/group';
import { Heading, HeadingProps } from '../Heading';

export interface GroupProps extends React.ComponentProps<'div'> {
  label: HeadingProps;
  labelVisuallyHidden?: boolean;
  elevation?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  children?: ReactNode;
}

export const Group = ({ elevation = 3, children, label, labelVisuallyHidden, className, ...props }: GroupProps) => {
  const labelId = useId('groupLabel');
  return (
    <div role='group' aria-labelledby={labelId} className={cx(defaultGroup({ elevation }), className)} {...props}>
      <Heading {...label} id={labelId} className={cx(labelVisuallyHidden && 'sr-only', 'mb-2', label?.className)} />
      {children}
    </div>
  );
};
