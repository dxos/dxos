//
// Copyright 2023 DXOS.org
//

import { useArrowNavigationGroup, useFocusableGroup } from '@fluentui/react-tabster';
import { CaretLeft, CaretRight, Circle, X } from '@phosphor-icons/react';
import React, { forwardRef } from 'react';
// TODO(thure): This needed to be imported in the package.json specifically to pacify TS2742. See if this is resolved with typescript@5.5.x.
// eslint-disable-next-line unused-imports/no-unused-imports
import _floater from 'react-floater';
import { type TooltipRenderProps, type Props } from 'react-joyride';
// TODO(thure): This needed to be imported in the package.json specifically to pacify TS2742. See if this is resolved with typescript@5.5.x.
// eslint-disable-next-line unused-imports/no-unused-imports
import _typefest from 'type-fest';

import { Button } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

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
export const Tooltip = forwardRef<HTMLDivElement, TooltipRenderProps>(
  ({ step: { title, content }, index, size, isLastStep, backProps, closeProps, primaryProps }, forwardedRef) => {
    const { steps, setIndex } = useHelp();
    const arrowGroup = useArrowNavigationGroup({ axis: 'horizontal' });
    const trapFocus = useFocusableGroup({ tabBehavior: 'limited-trap-focus' });

    return (
      <div
        className='flex flex-col is-[15rem] min-bs-[10rem] overflow-hidden rounded-md shadow-xl surface-accent fg-inverse'
        role='tooltip'
        data-testid='helpPlugin.tooltip'
        {...trapFocus}
        ref={forwardedRef}
      >
        <div className='flex p-2'>
          <h2 className='grow pli-2 plb-1 text-lg font-medium fg-inverse'>{title}</h2>
          <Button
            density='fine'
            variant='primary'
            onClick={closeProps.onClick}
            title={closeProps['aria-label']}
            data-testid='helpPlugin.tooltip.close'
          >
            <X weight='bold' className={getSize(4)} />
          </Button>
        </div>
        <div className='flex grow pli-4 mlb-2'>{content}</div>
        <div className='flex p-2 items-center justify-between' {...arrowGroup}>
          {
            <Button
              variant='primary'
              onClick={backProps.onClick}
              title={backProps['aria-label']}
              classNames={[!(index > 0 && backProps) && 'invisible']}
            >
              <CaretLeft className={getSize(5)} />
            </Button>
          }
          <div className='flex grow gap-2 justify-center'>
            <div className='flex'>
              {Array.from({ length: size }).map((_, i) => (
                // TODO(burdon): ReactNode element (not string).
                <span key={i} title={steps[i].title as string}>
                  <Circle
                    weight={index === i ? 'fill' : 'regular'}
                    className={mx(getSize(4), 'cursor-pointer')}
                    onClick={() => setIndex(i)}
                  />
                </span>
              ))}
            </div>
          </div>
          {isLastStep ? (
            <Button variant='primary' onClick={closeProps.onClick} title={closeProps['aria-label']} autoFocus>
              Done
            </Button>
          ) : (
            <Button variant='primary' onClick={primaryProps.onClick} title={primaryProps['aria-label']} autoFocus>
              <CaretRight className={getSize(6)} />
            </Button>
          )}
        </div>
      </div>
    );
  },
);
