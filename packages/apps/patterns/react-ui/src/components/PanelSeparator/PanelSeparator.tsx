//
// Copyright 2023 DXOS.org
//

import React, { ComponentProps } from 'react';

import { mx } from '@dxos/react-components';

export const PanelSeparator = ({ className, ...props }: ComponentProps<'span'>) => {
  return (
    <span
      role='none'
      {...props}
      className={mx('block bs-px mlb-1 bg-neutral-800/10 dark:bg-neutral-200/10', className)}
    />
  );
};
