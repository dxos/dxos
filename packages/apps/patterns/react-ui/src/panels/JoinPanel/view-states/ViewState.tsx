//
// Copyright 2023 DXOS.org
//

import React, { ComponentProps } from 'react';

import { mx } from '@dxos/react-components';

export type ViewStateProps = ComponentProps<'div'>;

export const ViewState = ({ children, className, ...props }: ViewStateProps) => {
  return (
    <div role='group' {...props} className={mx('basis-0 grow flex flex-col gap-1 p-2', className)}>
      {children}
    </div>
  );
};
