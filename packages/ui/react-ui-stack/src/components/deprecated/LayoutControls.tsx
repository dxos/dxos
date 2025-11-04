//
// Copyright 2024 DXOS.org
//

import React, { forwardRef } from 'react';

import { ButtonGroup, type ButtonGroupProps, type ButtonProps, IconButton, useTranslation } from '@dxos/react-ui';

import { translationKey } from '../../translations';

export type LayoutControlEvent = 'solo' | 'close' | `${'pin' | 'increment'}-${'start' | 'end'}`;
export type LayoutControlHandler = (event: LayoutControlEvent) => void;

export type LayoutCapabilities = {
  incrementStart?: boolean;
  incrementEnd?: boolean;
  solo?: boolean;
};

export type LayoutControlsProps = Omit<ButtonGroupProps, 'onClick'> & {
  onClick?: LayoutControlHandler;
  variant?: 'hide-disabled' | 'default';
  close?: boolean | 'minify-start' | 'minify-end';
  capabilities: LayoutCapabilities;
  isSolo?: boolean;
  pin?: 'start' | 'end' | 'both';
};

const LayoutControl = ({ icon, label, ...props }: Omit<ButtonProps, 'children'> & { label: string; icon: string }) => (
  <IconButton iconOnly icon={icon} label={label} tooltipSide='bottom' variant='ghost' {...props} />
);

export const LayoutControls = forwardRef<HTMLDivElement, LayoutControlsProps>(
  (
    { onClick, variant = 'default', capabilities: can, isSolo, pin, close = false, children, ...props },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const buttonClassNames = variant === 'hide-disabled' ? 'disabled:hidden !p-1' : '!p-1';

    return (
      <ButtonGroup {...props} ref={forwardedRef}>
        {pin && !isSolo && ['both', 'start'].includes(pin) && (
          <LayoutControl
            label={t('pin start label')}
            variant='ghost'
            classNames={buttonClassNames}
            onClick={() => onClick?.('pin-start')}
            icon='ph--caret-line-left--regular'
          />
        )}

        {can.solo && (
          <LayoutControl
            label={t('solo layout label')}
            classNames={buttonClassNames}
            onClick={() => onClick?.('solo')}
            icon={isSolo ? 'ph--arrows-in--regular' : 'ph--arrows-out--regular'}
          />
        )}

        {!isSolo && can.solo && (
          <>
            <LayoutControl
              label={t('increment start label')}
              disabled={!can.incrementStart}
              classNames={buttonClassNames}
              onClick={() => onClick?.('increment-start')}
              icon='ph--caret-left--regular'
            />
            <LayoutControl
              label={t('increment end label')}
              disabled={!can.incrementEnd}
              classNames={buttonClassNames}
              onClick={() => onClick?.('increment-end')}
              icon='ph--caret-right--regular'
            />
          </>
        )}

        {pin && !isSolo && ['both', 'end'].includes(pin) && (
          <LayoutControl
            label={t('pin end label')}
            classNames={buttonClassNames}
            onClick={() => onClick?.('pin-end')}
            icon='ph--caret-line-right--regular'
          />
        )}

        {close && !isSolo && (
          <LayoutControl
            label={t(`${typeof close === 'string' ? 'minify' : 'close'} label`)}
            classNames={buttonClassNames}
            onClick={() => onClick?.('close')}
            data-testid='layoutHeading.close'
            icon={
              close === 'minify-start'
                ? 'ph--caret-line-left--regular'
                : close === 'minify-end'
                  ? 'ph--caret-line-right--regular'
                  : 'ph--x--regular'
            }
          />
        )}
        {children}
      </ButtonGroup>
    );
  },
);
