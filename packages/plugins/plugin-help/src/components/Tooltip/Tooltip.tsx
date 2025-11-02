//
// Copyright 2023 DXOS.org
//

import { useArrowNavigationGroup, useFocusableGroup } from '@fluentui/react-tabster';
import React, { forwardRef } from 'react';
// TODO(thure): This needed to be imported in the package.json specifically to pacify TS2742. See if this is resolved with typescript@5.5.x.
// eslint-disable-next-line unused-imports/no-unused-imports
import _floater from 'react-floater';
import { type Props, type TooltipRenderProps } from 'react-joyride';
// TODO(thure): This needed to be imported in the package.json specifically to pacify TS2742. See if this is resolved with typescript@5.5.x.
// eslint-disable-next-line unused-imports/no-unused-imports
import _typefest from 'type-fest';

import { Button, Icon, IconButton } from '@dxos/react-ui';

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
    const arrowNavigationAttrs = useArrowNavigationGroup({ axis: 'horizontal' });
    const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited-trap-focus' });

    return (
      <div
        className='flex flex-col is-[15rem] min-bs-[10rem] overflow-hidden rounded-md shadow-xl bg-accentSurface text-accentSurfaceText'
        role='tooltip'
        data-testid='helpPlugin.tooltip'
        data-step={index + 1}
        {...focusableGroupAttrs}
        ref={forwardedRef}
      >
        <div className='flex p-2'>
          <h2 className='grow pli-2 plb-1 text-lg font-medium text-accentSurfaceText'>{title}</h2>
          <IconButton
            density='fine'
            icon='ph--x--bold'
            iconOnly
            label={closeProps['aria-label']}
            onClick={closeProps.onClick}
            size={4}
            variant='primary'
            data-testid='helpPlugin.tooltip.close'
          />
        </div>
        <div className='flex grow pli-4 mlb-2'>{content}</div>
        <div className='flex p-2 items-center justify-between' {...arrowNavigationAttrs}>
          {
            <IconButton
              classNames={[!(index > 0 && backProps) && 'invisible']}
              icon='ph--caret-left--regular'
              iconOnly
              label={backProps['aria-label']}
              onClick={backProps.onClick}
              variant='primary'
              data-testid='helpPlugin.tooltip.back'
            />
          }
          <div className='flex grow gap-2 justify-center'>
            <div className='flex'>
              {Array.from({ length: size }).map((_, i) => (
                <Icon
                  key={i}
                  icon={index === i ? 'ph--circle--fill' : 'ph--circle--regular'}
                  size={2}
                  classNames='mli-1 cursor-pointer'
                />
              ))}
            </div>
          </div>
          {isLastStep ? (
            <Button
              variant='primary'
              onClick={closeProps.onClick}
              title={closeProps['aria-label']}
              autoFocus
              data-testid='helpPlugin.tooltip.finish'
            >
              Done
            </Button>
          ) : (
            <IconButton
              autoFocus
              icon='ph--caret-right--regular'
              iconOnly
              label={primaryProps['aria-label']}
              onClick={primaryProps.onClick}
              size={6}
              variant='primary'
              data-testid='helpPlugin.tooltip.next'
            />
          )}
        </div>
      </div>
    );
  },
);
