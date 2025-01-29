//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';

import { DECK_PLUGIN } from '../../meta';
import { useLayout } from '../LayoutContext';

export const ToggleSidebarButton = () => {
  const layoutContext = useLayout();
  const { t } = useTranslation(DECK_PLUGIN);
  return (
    <IconButton
      variant='ghost'
      iconOnly
      icon='ph--sidebar--regular'
      size={4}
      label={t('open navigation sidebar label')}
      onClick={() => (layoutContext.sidebarOpen = !layoutContext.sidebarOpen)}
      classNames='!pli-2 order-first'
    />
  );
};

export const CloseSidebarButton = () => {
  const layoutContext = useLayout();
  const { t } = useTranslation(DECK_PLUGIN);
  return (
    <IconButton
      variant='ghost'
      iconOnly
      icon='ph--caret-line-left--regular'
      size={4}
      label={t('close navigation sidebar label')}
      onClick={() => (layoutContext.sidebarOpen = false)}
      classNames='!rounded-none !pli-1 ch-focus-ring-inset pie-[max(.5rem,env(safe-area-inset-left))]'
    />
  );
};

export const ToggleComplementarySidebarButton = () => {
  const layoutContext = useLayout();
  const { t } = useTranslation(DECK_PLUGIN);
  return (
    <IconButton
      iconOnly
      onClick={() => (layoutContext.complementarySidebarOpen = !layoutContext.complementarySidebarOpen)}
      variant='ghost'
      label={t('open complementary sidebar label')}
      classNames='!pli-2 !plb-3 [&>svg]:-scale-x-100'
      icon='ph--sidebar-simple--regular'
      size={4}
    />
  );
};

export const CloseComplementarySidebarButton = () => {
  const layoutContext = useLayout();
  const { t } = useTranslation(DECK_PLUGIN);
  return (
    <IconButton
      iconOnly
      variant='ghost'
      size={4}
      icon='ph--caret-line-right--regular'
      label={t('close complementary sidebar label')}
      classNames='!rounded-none border-is border-separator ch-focus-ring-inset pie-2 lg:pie-[max(.5rem,env(safe-area-inset-right))]'
      onClick={() => (layoutContext.complementarySidebarOpen = false)}
    />
  );
};
