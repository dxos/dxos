//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight, Circle, X } from '@phosphor-icons/react';
import React, { type KeyboardEvent, useEffect, useRef } from 'react';
import { type TooltipRenderProps } from 'react-joyride';

import { Button, DensityProvider } from '@dxos/react-ui';
import { getSize, inputSurface, mx } from '@dxos/react-ui-theme';

import { useHelp } from '../hooks';

// https://docs.react-joyride.com/styling
// https://github.com/gilbarbara/react-floater
export const floaterProps = {
  styles: {
    floater: {
      // TODO(burdon): Get tokens from tailwind.
      filter: 'drop-shadow(0 0 0.75rem rgba(0, 0, 0, 0.1))',
    },
  },
};

// TODO(burdon): Add info link to docs.
export const Tooltip = ({
  step: { title, content },
  index,
  size,
  isLastStep,
  backProps,
  closeProps,
  primaryProps,
}: TooltipRenderProps) => {
  const { steps, setIndex } = useHelp();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // TODO(burdon): This can't be right.
    setTimeout(() => {
      inputRef.current!.focus();
    }, 100);
  }, [inputRef]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft': {
        index > 0 && setIndex(index - 1);
        break;
      }
      case 'ArrowDown':
      case 'ArrowRight': {
        !isLastStep && setIndex(index + 1);
        break;
      }
    }
  };

  return (
    <DensityProvider density='fine'>
      <div
        className={mx('flex flex-col min-w-[10rem] max-w-[20rem] min-h-[10rem] overflow-hidden rounded', inputSurface)}
      >
        <div className='flex p-2 items-center'>
          <div className='grow px-2 text-lg text-primary-500'>{title}</div>
          <Button variant='ghost' onClick={closeProps.onClick} title={closeProps['aria-label']}>
            <X className={getSize(4)} />
          </Button>
        </div>
        <div className='flex grow px-4 py-2'>{content}</div>
        <input
          ref={inputRef}
          type='text'
          autoFocus
          // TODO(burdon): Better way to hide input?
          className='w-[1px] h-[1px] p-0 border-none outline-none -ml-8'
          onKeyDown={handleKeyDown}
        />
        <div className='flex p-2 items-center justify-between'>
          {index > 0 && backProps && (
            <Button variant='ghost' onClick={backProps.onClick} title={backProps['aria-label']}>
              <CaretLeft className={getSize(6)} />
            </Button>
          )}
          <div className='flex grow gap-2 justify-center'>
            <div className='flex'>
              {Array.from({ length: size }).map((_, i) => (
                // TODO(burdon): ReactNode element (not string).
                <span key={i} title={steps[i].title as string}>
                  <Circle
                    weight={index === i ? 'duotone' : 'regular'}
                    className={mx(getSize(4), 'cursor-pointer')}
                    onClick={() => setIndex(i)}
                  />
                </span>
              ))}
            </div>
          </div>
          {isLastStep ? (
            <Button variant='primary' onClick={closeProps.onClick} title={closeProps['aria-label']}>
              Done
            </Button>
          ) : (
            <Button variant='ghost' onClick={primaryProps.onClick} title={primaryProps['aria-label']}>
              <CaretRight className={getSize(6)} />
            </Button>
          )}
        </div>
      </div>
    </DensityProvider>
  );
};
