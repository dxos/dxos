//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { ButtonGroup, type ButtonGroupProps, type ButtonProps, IconButton, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type DeckOperation } from '#types';

import { type PlankCapabilities } from './useDeckPlank';

export type PlankControlHandler = (event: DeckOperation.PartAdjustment) => void;

//
// Controls
//

const plankControlSpacing = 'px-2';

export type PlankCompanionControlsProps = {
  primary?: string;
};

export const PlankCompanionControls = forwardRef<HTMLDivElement, PlankCompanionControlsProps>(
  ({ primary }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);
    const { invokePromise } = useOperationInvoker();
    const handleCloseCompanion = useCallback(() => {
      return invokePromise(LayoutOperation.UpdateCompanion, { subject: null });
    }, [invokePromise]);
    return (
      <div ref={forwardedRef} className='contents dx-app-no-drag'>
        <PlankControl
          label={t('close-companion.label')}
          variant='ghost'
          icon='ph--x--regular'
          onClick={handleCloseCompanion}
          classNames={plankControlSpacing}
        />
      </div>
    );
  },
);

const PlankControl = ({ icon, label, ...props }: Omit<ButtonProps, 'children'> & { label: string; icon: string }) => {
  return <IconButton label={label} icon={icon} iconOnly variant='ghost' tooltipSide='bottom' {...props} />;
};

//
// PlankControls
//

export type PlankControlsProps = Omit<ButtonGroupProps, 'onClick'> & {
  onClick?: PlankControlHandler;
  variant?: 'hide-disabled' | 'default';
  close?: boolean | 'minify-start' | 'minify-end';
  capabilities: PlankCapabilities;
  /** Whether the deck is in `solo` mode (a single active plank; companions excluded). */
  soloLook?: boolean;
  /** Whether this plank is currently displayed fullscreen. */
  fullscreen?: boolean;
  pin?: 'start' | 'end' | 'both';
};

// TODO(wittjosiah): Duplicate of stack LayoutControls?
//   Translations were to be duplicated between packages.
// NOTE(thure): Pinning & unpinning are disabled indefinitely.
export const PlankControls = forwardRef<HTMLDivElement, PlankControlsProps>(
  (
    {
      children,
      classNames,
      variant = 'default',
      capabilities,
      soloLook,
      fullscreen,
      pin,
      close = false,
      onClick,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(meta.profile.key);
    const buttonClassNames =
      variant === 'hide-disabled' ? `disabled:hidden ${plankControlSpacing}` : plankControlSpacing;

    return (
      <ButtonGroup {...props} classNames={['dx-app-no-drag opacity-100!', classNames]} ref={forwardedRef}>
        {/* Fullscreen is only offered for a singleton-active (solo-look) deck; "solo this plank" out of a
            multi-plank deck is covered by the existing close-others graph action instead. */}
        {capabilities.fullscreenToggle && soloLook && (
          <PlankControl
            label={t(fullscreen ? 'exit-fullscreen.label' : 'show-fullscreen-plank.label')}
            classNames={buttonClassNames}
            icon={fullscreen ? 'ph--corners-in--regular' : 'ph--corners-out--regular'}
            onClick={() => onClick?.('fullscreen')}
          />
        )}

        {/* Reordering controls (move plank toward start/end) are hidden for now; restore when the deck's
            reordering UX is revisited. The `increment-start`/`increment-end` adjustments and capabilities
            remain wired.
        {!soloLook && (
          <>
            <PlankControl
              label={t('increment-start.label')}
              disabled={!capabilities.incrementStart}
              classNames={buttonClassNames}
              icon='ph--caret-left--regular'
              onClick={() => onClick?.('increment-start')}
            />
            <PlankControl
              label={t('increment-end.label')}
              disabled={!capabilities.incrementEnd}
              classNames={buttonClassNames}
              icon='ph--caret-right--regular'
              onClick={() => onClick?.('increment-end')}
            />
          </>
        )} */}

        {close && !soloLook && (
          <PlankControl
            label={t(`${typeof close === 'string' ? 'minify' : 'close'}.label`)}
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
            label={t('open-companion.label')}
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

PlankControls.displayName = 'PlankControls';
