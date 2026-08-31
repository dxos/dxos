//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';
// TODO(thure): This needed to be imported in the package.json specifically to pacify TS2742. See if this is resolved with typescript@5.5.x.
// eslint-disable-next-line unused-imports/no-unused-imports
import _floater from 'react-floater';
import { type TooltipRenderProps } from 'react-joyride';
// TODO(thure): This needed to be imported in the package.json specifically to pacify TS2742. See if this is resolved with typescript@5.5.x.
// eslint-disable-next-line unused-imports/no-unused-imports
import _typefest from 'type-fest';

import { Button, Icon, IconButton, useFocusGroup, useMergeRefs } from '@dxos/react-ui';

// TODO(burdon): Add info link to docs.
export const Tooltip = forwardRef<HTMLDivElement, TooltipRenderProps>(
  ({ step: { title, content }, index, size, isLastStep, backProps, closeProps, primaryProps }, forwardedRef) => {
    const { ref: focusGroupRef, ...focusGroupProps } = useFocusGroup({ tabBehavior: 'limited-trap-focus' });
    const { ref: actionsRef, ...actionsProps } = useFocusGroup({ axis: 'horizontal' });

    return (
      <div
        className='flex flex-col w-[15rem] min-h-[10rem] overflow-hidden rounded-md shadow-xl bg-accent-bg text-accent-fg'
        role='tooltip'
        data-testid='helpPlugin.tooltip'
        data-step={index + 1}
        {...focusGroupProps}
        ref={useMergeRefs<HTMLDivElement>([forwardedRef, focusGroupRef])}
      >
        <div className='flex p-2'>
          <h2 className='grow px-2 py-1 text-lg font-medium text-accent-fg'>{title}</h2>
          <IconButton
            density='md'
            icon='ph--x--bold'
            iconOnly
            label={closeProps['aria-label']}
            onClick={closeProps.onClick}
            size={4}
            variant='primary'
            data-testid='helpPlugin.tooltip.close'
          />
        </div>
        <div className='flex grow px-4 my-2'>{content}</div>
        <div className='flex p-2 items-center justify-between' {...actionsProps} ref={actionsRef}>
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
                  classNames='mx-1 cursor-pointer'
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
