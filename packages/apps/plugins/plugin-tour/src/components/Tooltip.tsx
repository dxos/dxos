//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import React from 'react';
import { type TooltipRenderProps } from 'react-joyride';

import { Button, DensityProvider } from '@dxos/react-ui';

export const Tooltip = ({ step, primaryProps, backProps, closeProps }: TooltipRenderProps) => {
  const { title, content } = step;

  return (
    <DensityProvider density='fine'>
      <div className='flex flex-col min-w-[10rem] max-w-[20rem] min-h-[10rem] rounded bg-white'>
        <div className='flex p-2 items-center'>
          <div className='grow px-2 text-lg text-primary-500'>{title}</div>
          <Button variant='ghost' onClick={closeProps.onClick} title={closeProps['aria-label']}>
            <X />
          </Button>
        </div>
        <div className='flex grow px-4'>{content}</div>
        <div className='flex p-2 items-center justify-between'>
          {backProps && (
            <Button variant='ghost' onClick={backProps.onClick} title={backProps['aria-label']}>
              <CaretLeft />
            </Button>
          )}
          <Button variant='ghost' onClick={primaryProps.onClick} title={primaryProps['aria-label']}>
            <CaretRight />
          </Button>
        </div>
      </div>
    </DensityProvider>
  );
};
