//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import {
  ButtonGroup,
  type ButtonGroupProps,
  IconButton,
  type IconButtonProps,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';

import { DECK_PLUGIN } from '../../meta';
import { DeckAction, type LayoutMode } from '../../types';

export type PlankControlHandler = (event: DeckAction.PartAdjustment) => void;

export type PlankCapabilities = {
  incrementStart?: boolean;
  incrementEnd?: boolean;
  deck?: boolean;
  solo?: boolean;
  companion?: boolean;
};

export type PlankControlsProps = Omit<ButtonGroupProps, 'onClick'> & {
  onClick?: PlankControlHandler;
  variant?: 'hide-disabled' | 'default';
  close?: boolean | 'minify-start' | 'minify-end';
  capabilities: PlankCapabilities;
  layoutMode?: LayoutMode;
  pin?: 'start' | 'end' | 'both';
};

const PlankControl = ({ icon, label, ...props }: IconButtonProps) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <IconButton variant='ghost' icon={icon} label={label} iconOnly size={5} {...props} />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side='bottom'>{label}</Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

const plankControlSpacing = 'pli-2';

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
          icon='ph--x--regular'
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
    { children, classNames, variant = 'default', capabilities, layoutMode, pin, close = false, onClick, ...props },
    forwardedRef,
  ) => {
    const { t } = useTranslation(DECK_PLUGIN);
    const buttonClassNames =
      variant === 'hide-disabled' ? `disabled:hidden ${plankControlSpacing}` : plankControlSpacing;

    const layoutIsAnySolo = !!layoutMode?.startsWith('solo');

    return (
      <ButtonGroup {...props} classNames={['app-no-drag', classNames]} ref={forwardedRef}>
        {capabilities.deck && (
          <>
            {capabilities.solo && (
              <>
                {layoutMode === 'solo' && (
                  <PlankControl
                    label={t('show fullscreen plank label')}
                    classNames={buttonClassNames}
                    icon='ph--corners-out--regular'
                    onClick={() => onClick?.('solo--fullscreen')}
                  />
                )}
                <PlankControl
                  label={t(
                    layoutMode === 'solo--fullscreen'
                      ? 'exit fullscreen label'
                      : layoutIsAnySolo
                        ? 'show deck plank label'
                        : 'show solo plank label',
                  )}
                  classNames={buttonClassNames}
                  icon={
                    layoutMode === 'solo--fullscreen'
                      ? 'ph--corners-in--regular'
                      : layoutIsAnySolo
                        ? 'ph--arrows-in-line-horizontal--regular'
                        : 'ph--arrows-out-line-horizontal--regular'
                  }
                  onClick={() => onClick?.(layoutMode === 'solo--fullscreen' ? 'solo--fullscreen' : 'solo')}
                />
              </>
            )}

            {!layoutIsAnySolo && (
              <>
                <PlankControl
                  label={t('increment start label')}
                  disabled={!capabilities.incrementStart}
                  classNames={buttonClassNames}
                  icon='ph--caret-left--regular'
                  onClick={() => onClick?.('increment-start')}
                />
                <PlankControl
                  label={t('increment end label')}
                  disabled={!capabilities.incrementEnd}
                  classNames={buttonClassNames}
                  icon='ph--caret-right--regular'
                  onClick={() => onClick?.('increment-end')}
                />
              </>
            )}
          </>
        )}

        {close && !layoutIsAnySolo && (
          <PlankControl
            label={t(`${typeof close === 'string' ? 'minify' : 'close'} label`)}
            classNames={buttonClassNames}
            data-testid='plankHeading.close'
            icon={
              close === 'minify-start'
                ? 'ph--caret-line-left--regular'
                : close === 'minify-end'
                  ? 'ph--caret-line-right--regular'
                  : 'ph--x--regular'
            }
            onClick={() => onClick?.('close')}
          />
        )}

        {capabilities.companion && (
          <PlankControl
            label={t('open companion label')}
            classNames={buttonClassNames}
            data-testid='plankHeading.companion'
            icon='ph--square-split-horizontal--regular'
            onClick={() => onClick?.('companion')}
          />
        )}
        {children}
      </ButtonGroup>
    );
  },
);
