//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight, Circle, X } from '@phosphor-icons/react';
import React, { type KeyboardEvent, useEffect, useRef } from 'react';
import { type TooltipRenderProps, type Props } from 'react-joyride';

import { Button, DensityProvider } from '@dxos/react-ui';
import { getSize, mx, accentSurface } from '@dxos/react-ui-theme';

import { useHelp } from '../../hooks';

// https://docs.react-joyride.com/styling
// https://github.com/gilbarbara/react-floater
export const floaterProps: Props['floaterProps'] = {
  styles: {
    // Arrow color is set by joyride.
    arrow: {
      length: 8,
      spread: 16,
    },
    floater: {
      // TODO(burdon): Get tokens from theme.
      filter: 'drop-shadow(0 0 0.75rem rgba(0, 0, 0, 0.2))',
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
  const { steps, setIndex, stop } = useHelp();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // TODO(burdon): This can't be right?
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [inputRef]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Enter': {
        stop();
        break;
      }
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
        className={mx(
          'flex flex-col min-w-[12rem] max-w-[30rem] min-h-[10rem] overflow-hidden rounded-md',
          'shadow-xl',
          accentSurface,
        )}
      >
        <div className='flex p-2 items-center'>
          <div className='grow px-2 text-lg fg-inverse'>{title}</div>
          <Button variant='primary' onClick={closeProps.onClick} title={closeProps['aria-label']}>
            <X className={getSize(4)} />
          </Button>
        </div>
        <div className='flex grow px-4 py-2'>{content}</div>
        <input
          ref={inputRef}
          type='text'
          autoFocus
          // TODO(burdon): Better way to hide input?
          className='w-[1px] h-[1px] p-0 border-none outline-none -ml-16'
          onKeyDown={handleKeyDown}
        />
        <div className='flex p-2 items-center justify-between'>
          {index > 0 && backProps ? (
            <Button variant='primary' onClick={backProps.onClick} title={backProps['aria-label']}>
              <CaretLeft className={getSize(6)} />
            </Button>
          ) : (
            <Button variant='primary' classNames='invisible'>
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
            <Button variant='primary' onClick={primaryProps.onClick} title={primaryProps['aria-label']}>
              <CaretRight className={getSize(6)} />
            </Button>
          )}
        </div>
      </div>
    </DensityProvider>
  );
};
