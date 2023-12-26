//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import React from 'react';
import { type TooltipRenderProps } from 'react-joyride';

import { Button, DensityProvider } from '@dxos/react-ui';

// https://github.com/gilbarbara/react-floater
export const floaterProps = {
  styles: {
    floater: {
      // TODO(burdon): Get tokens from tailwind.
      filter: 'drop-shadow(0 0 0.75rem rgba(0, 0, 0, 0.1))',
    },
  },
};

// TODO(burdon): Add info link.
export const Tooltip = ({ index, isLastStep, step, primaryProps, backProps, closeProps }: TooltipRenderProps) => {
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
        <div className='flex grow px-4 py-2'>{content}</div>
        <div className='flex p-2 items-center justify-between'>
          {index > 0 && backProps && (
            <Button variant='ghost' onClick={backProps.onClick} title={backProps['aria-label']}>
              <CaretLeft />
            </Button>
          )}
          <div className='grow' />
          {isLastStep ? (
            <Button variant='primary' onClick={closeProps.onClick} title={closeProps['aria-label']}>
              Done
            </Button>
          ) : (
            <Button variant='ghost' onClick={primaryProps.onClick} title={primaryProps['aria-label']}>
              <CaretRight />
            </Button>
          )}
        </div>
      </div>
    </DensityProvider>
  );
};
