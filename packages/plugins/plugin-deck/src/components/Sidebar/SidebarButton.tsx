//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { IconButton, type IconButtonProps, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { getCompanionId, useDeckCompanions, useDeckState } from '../../hooks';
import { meta } from '../../meta';

export const ToggleSidebarButton = ({
  classNames,
  variant = 'ghost',
}: ThemedClassName<Pick<IconButtonProps, 'variant'>>) => {
  const { updateState } = useDeckState();
  const { t } = useTranslation(meta.id);

  const handleClick = useCallback(() => {
    updateState((state) => ({
      ...state,
      sidebarState: state.sidebarState === 'expanded' ? 'collapsed' : 'expanded',
    }));
  }, [updateState]);

  return (
    <IconButton
      variant={variant}
      icon='ph--sidebar--regular'
      iconOnly
      size={4}
      label={t('open navigation sidebar label')}
      onClick={handleClick}
      classNames={classNames}
    />
  );
};

export const CloseSidebarButton = () => {
  const { updateState } = useDeckState();
  const { t } = useTranslation(meta.id);

  const handleClick = useCallback(() => {
    updateState((state) => ({ ...state, sidebarState: 'collapsed' }));
  }, [updateState]);

  return (
    <IconButton
      variant='ghost'
      icon='ph--caret-line-left--regular'
      iconOnly
      size={4}
      label={t('close navigation sidebar label')}
      onClick={handleClick}
      classNames='rounded-none px-1 dx-focus-ring-inset pe-[max(.5rem,env(safe-area-inset-left))]'
    />
  );
};

export const ToggleComplementarySidebarButton = ({
  inR0,
  classNames,
  current,
}: ThemedClassName<{ inR0?: boolean; current?: string }>) => {
  const { invokeSync } = useOperationInvoker();
  const { state, updateState } = useDeckState();
  const { t } = useTranslation(meta.id);

  const companions = useDeckCompanions();
  const handleClick = useCallback(() => {
    const nextState = state.complementarySidebarState === 'expanded' ? 'collapsed' : 'expanded';
    updateState((state) => ({ ...state, complementarySidebarState: nextState }));

    const subject = state.complementarySidebarPanel ?? (companions[0] && getCompanionId(companions[0].id));
    if (nextState === 'expanded' && !current && subject) {
      invokeSync(LayoutOperation.UpdateComplementary, { subject });
    }
  }, [state, updateState, current, companions, invokeSync]);

  return (
    <IconButton
      variant='ghost'
      classNames={['[&>svg]:-scale-x-100', classNames]}
      icon='ph--sidebar-simple--regular'
      iconOnly
      label={t('open complementary sidebar label')}
      size={inR0 ? 5 : 4}
      tooltipSide={inR0 ? 'left' : undefined}
      onClick={handleClick}
    />
  );
};
