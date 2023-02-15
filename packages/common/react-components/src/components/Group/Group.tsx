//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';

import { useId } from '../../hooks';
import { defaultGroup } from '../../styles';
import { mx } from '../../util';
import { Heading, HeadingProps } from '../Heading';
import { Elevation } from '../../props';
import { ElevationProvider } from '../ElevationProvider';

export interface GroupProps extends React.ComponentProps<'div'> {
  label: HeadingProps;
  labelVisuallyHidden?: boolean;
  elevation?: Elevation;
  children?: ReactNode;
}

export const Group = ({ elevation = 'group', children, label, labelVisuallyHidden, ...rootSlot }: GroupProps) => {
  const labelId = useId('groupLabel');
  return (
    <div
      role='group'
      aria-labelledby={labelId}
      {...rootSlot}
      className={mx(defaultGroup({ elevation }), rootSlot?.className)}
    >
      <Heading {...label} id={labelId} className={mx(labelVisuallyHidden && 'sr-only', 'mb-2', label?.className)} />
      <ElevationProvider elevation={elevation}>{children}</ElevationProvider>
    </div>
  );
};
