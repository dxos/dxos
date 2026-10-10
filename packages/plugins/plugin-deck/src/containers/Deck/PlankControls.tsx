//
// Copyright 2024 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef, useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';
import { DeckOperation } from '#types';

import { type PlankCapabilities } from './useDeckPlank.ts';

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
    const { t } = UiHooks.useTranslation(meta.profile.key);
    const { invokePromise } = Hooks.useOperationInvoker();
    // `anchor` names the plank this control belongs to: companions are per-plank, and resolving the
    // target from attention instead would close whichever plank happened to be attended.
    const handleCloseCompanion = useCallback(() => {
      return invokePromise(LayoutOperation.UpdateCompanion, { subject: null, anchor: primary });
    }, [invokePromise, primary]);
    return (
      <div ref={forwardedRef} className='contents dx-app-no-drag'>
        <PlankControl
          label={t('close-companion.label')}
          variant='ghost'
          data-testid='plankHeading.closeCompanion'
          icon='ph--x--regular'
          onClick={() => void handleCloseCompanion()}
          classNames={plankControlSpacing}
        />
      </div>
    );
  },
);

type PlankControlProps = Pick<ComponentPropsWithoutRef<typeof Button.Root>, 'variant' | 'classNames' | 'disabled'> & {
  'label': string;
  'icon': string;
  'onClick'?: () => void;
  'data-testid'?: string;
};

const PlankControl = ({ icon, label, variant = 'ghost', ...props }: PlankControlProps) => {
  return <Button.Root {...props} label={label} icon={icon} iconOnly variant={variant} tooltipSide='bottom' />;
};

//
// PlankControls
//

export type PlankControlsProps = Omit<ComponentPropsWithoutRef<typeof Button.Group>, 'onClick'> & {
  onClick?: PlankControlHandler;
  variant?: 'hide-disabled' | 'default';
  close?: boolean | 'minify-start' | 'minify-end';
  capabilities: PlankCapabilities;
  /** Whether this plank is currently displayed fullscreen. */
  fullscreen?: boolean;
  /** Whether this plank is currently expanded to fill the deck. */
  expanded?: boolean;
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
      fullscreen,
      expanded,
      pin,
      close = false,
      onClick,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = UiHooks.useTranslation(meta.profile.key);
    const buttonClassNames =
      variant === 'hide-disabled' ? `disabled:hidden ${plankControlSpacing}` : plankControlSpacing;

    return (
      <Button.Group compact {...props} classNames={['dx-app-no-drag opacity-100!', classNames]} ref={forwardedRef}>
        {capabilities.expandToggle && (
          <PlankControl
            label={t(expanded ? 'collapse-plank.label' : 'expand-plank.label')}
            classNames={buttonClassNames}
            icon={expanded ? 'ph--arrows-in-line-horizontal--regular' : 'ph--arrows-out-line-horizontal--regular'}
            data-testid='plankHeading.expand'
            onClick={() => onClick?.('expand')}
          />
        )}

        {capabilities.fullscreenToggle && (
          <PlankControl
            label={t(fullscreen ? 'exit-fullscreen.label' : 'show-fullscreen-plank.label')}
            classNames={buttonClassNames}
            icon={fullscreen ? 'ph--corners-in--regular' : 'ph--corners-out--regular'}
            onClick={() => onClick?.('fullscreen')}
          />
        )}

        {/* Reordering controls (move plank toward start/end) are hidden for now; restore when the deck's
            reordering UX is revisited. The `increment-start`/`increment-end` adjustments and capabilities
            remain wired, and already encode ordering (a lone plank can move in neither direction).
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
        /> */}

        {close && (
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
      </Button.Group>
    );
  },
);

PlankControls.displayName = 'PlankControls';
