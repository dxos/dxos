//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useCapability } from '@dxos/app-framework';
import { IconButton, type IconButtonProps, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { DeckCapabilities } from '../../capabilities';
import { DECK_PLUGIN } from '../../meta';

export const ToggleSidebarButton = ({
  classNames,
  variant = 'ghost',
}: ThemedClassName<Pick<IconButtonProps, 'variant'>>) => {
  const layoutContext = useCapability(DeckCapabilities.MutableDeckState);
  const { t } = useTranslation(DECK_PLUGIN);
  return (
    <IconButton
      variant={variant}
      iconOnly
      icon='ph--sidebar--regular'
      size={4}
      label={t('open navigation sidebar label')}
      onClick={() =>
        (layoutContext.sidebarState = layoutContext.sidebarState === 'expanded' ? 'collapsed' : 'expanded')
      }
      classNames={classNames}
    />
  );
};

export const CloseSidebarButton = () => {
  const layoutContext = useCapability(DeckCapabilities.MutableDeckState);
  const { t } = useTranslation(DECK_PLUGIN);
  return (
    <IconButton
      variant='ghost'
      iconOnly
      icon='ph--caret-line-left--regular'
      size={4}
      label={t('close navigation sidebar label')}
      onClick={() => (layoutContext.sidebarState = 'collapsed')}
      classNames='rounded-none pli-1 dx-focus-ring-inset pie-[max(.5rem,env(safe-area-inset-left))]'
    />
  );
};

export const ToggleComplementarySidebarButton = ({ inR0, classNames }: ThemedClassName<{ inR0?: boolean }>) => {
  const layoutContext = useCapability(DeckCapabilities.MutableDeckState);
  const { t } = useTranslation(DECK_PLUGIN);
  return (
    <IconButton
      iconOnly
      onClick={() =>
        (layoutContext.complementarySidebarState =
          layoutContext.complementarySidebarState === 'expanded' ? 'collapsed' : 'expanded')
      }
      variant='ghost'
      label={t('open complementary sidebar label')}
      classNames={['[&>svg]:-scale-x-100', classNames]}
      icon='ph--sidebar-simple--regular'
      size={inR0 ? 5 : 4}
      tooltipSide={inR0 ? 'left' : undefined}
    />
  );
};
