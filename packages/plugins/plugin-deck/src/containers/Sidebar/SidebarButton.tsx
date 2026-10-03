//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Attention } from '@dxos/react-ui-attention';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import type * as Util from '@dxos/react-ui/Util';

import { useDeckCompanions, useDeckState } from '#hooks';
import { meta } from '#meta';

export const ToggleSidebarButton = ({
  classNames,
  variant = 'ghost',
}: Util.ThemedClassName<Pick<Button.ButtonProps, 'variant'>>) => {
  const { updateState } = useDeckState();
  const { t } = UiHooks.useTranslation(meta.profile.key);

  const handleClick = useCallback(() => {
    updateState((state) => ({
      ...state,
      sidebarState: state.sidebarState === 'expanded' ? 'collapsed' : 'expanded',
    }));
  }, [updateState]);

  return (
    <Button.Button
      variant={variant}
      icon='ph--sidebar--regular'
      iconOnly
      iconSize='md'
      label={t('open-navigation-sidebar.label')}
      onClick={handleClick}
      classNames={classNames}
    />
  );
};

export const CloseSidebarButton = () => {
  const { updateState } = useDeckState();
  const { t } = UiHooks.useTranslation(meta.profile.key);

  const handleClick = useCallback(() => {
    updateState((state) => ({ ...state, sidebarState: 'collapsed' }));
  }, [updateState]);

  return (
    <Button.Button
      variant='ghost'
      icon='ph--caret-line-left--regular'
      iconOnly
      iconSize='md'
      label={t('close-navigation-sidebar.button')}
      onClick={handleClick}
      classNames='rounded-none px-1 dx-focus-ring-inset pe-[max(.5rem,env(safe-area-inset-left))]'
    />
  );
};

export const ToggleComplementarySidebarButton = ({
  inR0,
  classNames,
  current,
}: Util.ThemedClassName<{ inR0?: boolean; current?: string }>) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const { state, updateState } = useDeckState();
  const { t } = UiHooks.useTranslation(meta.profile.key);

  const companions = useDeckCompanions();
  const handleClick = useCallback(() => {
    const nextState = state.complementarySidebarState === 'expanded' ? 'collapsed' : 'expanded';
    updateState((state) => ({ ...state, complementarySidebarState: nextState }));

    const subject = state.complementarySidebarPanel ?? (companions[0] && Attention.getLinkedVariant(companions[0].id));
    if (nextState === 'expanded' && !current && subject) {
      void invokePromise(LayoutOperation.UpdateComplementary, { subject });
    }
  }, [state, updateState, current, companions, invokePromise]);

  const label = t(
    state.complementarySidebarState === 'expanded'
      ? 'close-complementary-sidebar.label'
      : 'open-complementary-sidebar.label',
  );

  return (
    <Button.Button
      variant='ghost'
      classNames={['[&>svg]:-scale-x-100', classNames]}
      icon='ph--sidebar-simple--regular'
      iconOnly
      label={label}
      tooltipSide={inR0 ? 'left' : undefined}
      onClick={handleClick}
    />
  );
};

ToggleSidebarButton.displayName = 'ToggleSidebarButton';

CloseSidebarButton.displayName = 'CloseSidebarButton';

ToggleComplementarySidebarButton.displayName = 'ToggleComplementarySidebarButton';
