//
// Copyright 2022 DXOS.org
//

import React, { type ReactNode } from 'react';

import { useId, type Elevation, ElevationProvider } from '@dxos/aurora';
import { group, mx } from '@dxos/aurora-theme';

import { Heading, type HeadingProps } from '../Heading';

export interface GroupProps extends React.ComponentProps<'div'> {
  label: HeadingProps;
  labelVisuallyHidden?: boolean;
  elevation?: Elevation;
  children?: ReactNode;
}

export const Group = ({ elevation = 'group', children, label, labelVisuallyHidden, ...rootSlot }: GroupProps) => {
  const labelId = useId('groupLabel');
  return (
    <div role='group' aria-labelledby={labelId} {...rootSlot} className={mx(group({ elevation }), rootSlot?.className)}>
      <Heading {...label} id={labelId} className={mx(labelVisuallyHidden && 'sr-only', 'mb-2', label?.className)} />
      <ElevationProvider elevation={elevation}>{children}</ElevationProvider>
    </div>
  );
};
