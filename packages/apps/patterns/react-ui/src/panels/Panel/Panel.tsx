//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren, ReactNode } from 'react';

import { DensityProvider, mx } from '@dxos/react-components';

import { defaultSurface } from '../../styles';
import { Bar } from './Bar';
import { CloseButton, CloseButtonProps } from './CloseButton';
import { Title } from './Title';
import { Content, ContentProps } from './Content';

export type PanelProps = PropsWithChildren & {
  className?: string;
  title?: string;
  onClose?: () => any;
  helpContent?: ReactNode;
  slots?: {
    closeButton?: Partial<CloseButtonProps>;
    content?: Partial<ContentProps>;
  };
};

export const Panel = (props: PanelProps) => {
  const { children, className, title, slots, onClose } = { ...props };
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
        <Bar
          className={title || onClose ? 'min-h-[3rem]' : 'min-h-[2rem]'}
          center={<Title>{title}</Title>}
          right={onClose ? <CloseButton onClick={onClose} {...slots?.closeButton} /> : null}
        />
        <Content padded {...slots?.content}>
          {children}
        </Content>
      </div>
    </DensityProvider>
  );
};
