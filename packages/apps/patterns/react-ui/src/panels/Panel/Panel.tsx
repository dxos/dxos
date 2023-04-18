//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren, ReactNode } from 'react';

import { DensityProvider, mx } from '@dxos/react-components';

import { defaultSurface } from '../../styles';
import { Bar } from './Bar';
import { CloseButton } from './CloseButton';
import { Title } from './Title';

export type PanelProps = PropsWithChildren & {
  className?: string;
  title?: string;
  onClose?: () => any;
  helpContent?: ReactNode;
};

export const Panel = (props: PanelProps) => {
  const { children, className, title } = { ...props };
  return (
    <DensityProvider density='fine'>
      <div
        role='none'
        className={mx(
          defaultSurface,
          'rounded-md shadow-md backdrop-blur-md text-neutral-750 dark:text-neutral-250',
          className
        )}
      >
        <Bar center={<Title>{title}</Title>} right={<CloseButton />} />
        <div className='p-4 pbs-0'>{children}</div>
      </div>
    </DensityProvider>
  );
};
