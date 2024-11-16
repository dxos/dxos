//
// Copyright 2024 DXOS.org
//

import React, { forwardRef } from 'react';

import {
  Button,
  ButtonGroup,
  type ButtonGroupProps,
  type ButtonProps,
  Icon,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';

import { DECK_PLUGIN } from '../../meta';

export type PlankControlEvent = 'solo' | 'close' | `${'pin' | 'increment'}-${'start' | 'end'}`;
export type PlankControlHandler = (event: PlankControlEvent) => void;

export type PlankCapabilities = {
  incrementStart?: boolean;
  incrementEnd?: boolean;
  solo?: boolean;
};

export type PlankControlsProps = Omit<ButtonGroupProps, 'onClick'> & {
  onClick?: PlankControlHandler;
  variant?: 'hide-disabled' | 'default';
  close?: boolean | 'minify-start' | 'minify-end';
  capabilities: PlankCapabilities;
  isSolo?: boolean;
  pin?: 'start' | 'end' | 'both';
};

const PlankControl = ({ icon, label, ...props }: Omit<ButtonProps, 'children'> & { label: string; icon: string }) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Button variant='ghost' {...props}>
          <span className='sr-only'>{label}</span>
          <Icon icon={icon} />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side='bottom' classNames='z-[70]'>
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

export const PlankControls = forwardRef<HTMLDivElement, PlankControlsProps>(
  (
    { onClick, variant = 'default', capabilities: can, isSolo, pin, close = false, children, ...props },
    forwardedRef,
  ) => {
    const { t } = useTranslation(DECK_PLUGIN);
    const buttonClassNames = variant === 'hide-disabled' ? 'disabled:hidden !p-1' : '!p-1';

    return (
      <ButtonGroup {...props} ref={forwardedRef}>
        {pin && !isSolo && ['both', 'start'].includes(pin) && (
          <PlankControl
            label={t('pin start label')}
            variant='ghost'
            classNames={buttonClassNames}
            onClick={() => onClick?.('pin-start')}
            icon='ph--caret-line-left--regular'
          />
        )}

        {can.solo && (
          <PlankControl
            label={t('solo plank label')}
            classNames={buttonClassNames}
            onClick={() => onClick?.('solo')}
            icon={isSolo ? 'ph--arrows-in--regular' : 'ph--arrows-out--regular'}
          />
        )}

        {!isSolo && can.solo && (
          <>
            <PlankControl
              label={t('increment start label')}
              disabled={!can.incrementStart}
              classNames={buttonClassNames}
              onClick={() => onClick?.('increment-start')}
              icon='ph--caret-left--regular'
            />
            <PlankControl
              label={t('increment end label')}
              disabled={!can.incrementEnd}
              classNames={buttonClassNames}
              onClick={() => onClick?.('increment-end')}
              icon='ph--caret-right--regular'
            />
          </>
        )}

        {pin && !isSolo && ['both', 'end'].includes(pin) && (
          <PlankControl
            label={t('pin end label')}
            classNames={buttonClassNames}
            onClick={() => onClick?.('pin-end')}
            icon='ph--caret-line-right--regular'
          />
        )}

        {close && !isSolo && (
          <PlankControl
            label={t(`${typeof close === 'string' ? 'minify' : 'close'} label`)}
            classNames={buttonClassNames}
            onClick={() => onClick?.('close')}
            data-testid='plankHeading.close'
            icon={
              close === 'minify-start'
                ? 'ph--caret-line-left--regular'
                : close === 'minify-end'
                  ? 'ph--caret-line-right--regular'
                  : 'ph--minus--regular'
            }
          />
        )}
        {children}
      </ButtonGroup>
    );
  },
);
