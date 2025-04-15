//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
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
import { DeckAction } from '../../types';

export type PlankControlHandler = (event: DeckAction.PartAdjustment) => void;

export type PlankCapabilities = {
  incrementStart?: boolean;
  incrementEnd?: boolean;
  solo?: boolean;
  companion?: boolean;
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
          <Icon icon={icon} size={5} />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side='bottom'>{label}</Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

const plankControlSpacing = 'pli-2 plb-3';

type PlankComplimentControlsProps = {
  primary?: string;
};

export const PlankCompanionControls = forwardRef<HTMLDivElement, PlankComplimentControlsProps>(
  ({ primary }, forwardedRef) => {
    const { t } = useTranslation(DECK_PLUGIN);
    const { dispatchPromise: dispatch } = useIntentDispatcher();
    const handleCloseCompanion = useCallback(() => {
      invariant(primary);
      return dispatch(createIntent(DeckAction.ChangeCompanion, { primary, companion: null }));
    }, []);
    return (
      <div ref={forwardedRef} className='contents app-no-drag'>
        <PlankControl
          label={t('close companion label')}
          variant='ghost'
          icon='ph--minus--regular'
          onClick={handleCloseCompanion}
          classNames={plankControlSpacing}
        />
      </div>
    );
  },
);

// TODO(wittjosiah): Duplicate of stack LayoutControls?
//   Translations were to be duplicated between packages.
// NOTE(thure): Pinning & unpinning are disabled indefinitely.
export const PlankControls = forwardRef<HTMLDivElement, PlankControlsProps>(
  (
    { onClick, variant = 'default', capabilities: can, isSolo, pin, close = false, children, classNames, ...props },
    forwardedRef,
  ) => {
    const { t } = useTranslation(DECK_PLUGIN);
    const buttonClassNames =
      variant === 'hide-disabled' ? `disabled:hidden ${plankControlSpacing}` : plankControlSpacing;

    return (
      <ButtonGroup {...props} classNames={['app-no-drag', classNames]} ref={forwardedRef}>
        {/* {pin && !isSolo && ['both', 'start'].includes(pin) && (
          <PlankControl
            label={t('pin start label')}
            variant='ghost'
            classNames={buttonClassNames}
            onClick={() => onClick?.('pin-start')}
            icon='ph--caret-line-left--regular'
          />
        )} */}

        {can.solo && (
          <PlankControl
            label={isSolo ? t('show deck plank label') : t('show solo plank label')}
            classNames={buttonClassNames}
            onClick={() => onClick?.('solo')}
            icon={isSolo ? 'ph--corners-in--regular' : 'ph--corners-out--regular'}
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

        {/* {pin && !isSolo && ['both', 'end'].includes(pin) && (
          <PlankControl
            label={t('pin end label')}
            classNames={buttonClassNames}
            onClick={() => onClick?.('pin-end')}
            icon='ph--caret-line-right--regular'
          />
        )} */}

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
                  : 'ph--x--regular'
            }
          />
        )}

        {can.companion && (
          <PlankControl
            label={t('companion label')}
            classNames={buttonClassNames}
            onClick={() => onClick?.('companion')}
            data-testid='plankHeading.companion'
            icon='ph--square-split-horizontal--regular'
          />
        )}
        {children}
      </ButtonGroup>
    );
  },
);
