//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren, ReactNode } from 'react';

import { DensityProvider, mx } from '@dxos/react-components';

import { defaultSurface } from '../../styles';
import { HelpButton } from './HelpButton';

export type PanelProps = PropsWithChildren & {
  className?: string;
  slots?: {
    helpContent?: ReactNode;
  };
};

export const Panel = (props: PanelProps) => {
  const { children, className, slots } = { slots: {}, ...props };
  return (
    <DensityProvider density='fine'>
      <div
        role='none'
        className={mx(defaultSurface, 'rounded-md shadow-md backdrop-blur-md overflow-hidden', className)}
      >
        {slots.helpContent && <HelpButton />}
        {children}
      </div>
    </DensityProvider>
  );
};
