//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { LayoutAction, createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { IconButton, type IconButtonProps, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { DeckCapabilities } from '../../capabilities';
import { getCompanionId, useDeckCompanions } from '../../hooks';
import { meta } from '../../meta';

export const ToggleSidebarButton = ({
  classNames,
  variant = 'ghost',
}: ThemedClassName<Pick<IconButtonProps, 'variant'>>) => {
  const layoutContext = useCapability(DeckCapabilities.MutableDeckState);
  const { t } = useTranslation(meta.id);
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
  const { t } = useTranslation(meta.id);
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

export const ToggleComplementarySidebarButton = ({
  inR0,
  classNames,
  current,
}: ThemedClassName<{ inR0?: boolean; current?: string }>) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const layoutContext = useCapability(DeckCapabilities.MutableDeckState);
  const { t } = useTranslation(meta.id);

  const companions = useDeckCompanions();
  const handleClick = useCallback(async () => {
    layoutContext.complementarySidebarState =
      layoutContext.complementarySidebarState === 'expanded' ? 'collapsed' : 'expanded';
    const firstCompanion = companions[0];
    if (layoutContext.complementarySidebarState === 'expanded' && !current && firstCompanion) {
      await dispatch(
        createIntent(LayoutAction.UpdateComplementary, {
          part: 'complementary',
          subject: getCompanionId(firstCompanion.id),
        }),
      );
    }
  }, [layoutContext, current, companions, dispatch]);

  return (
    <IconButton
      iconOnly
      onClick={handleClick}
      variant='ghost'
      label={t('open complementary sidebar label')}
      classNames={['[&>svg]:-scale-x-100', classNames]}
      icon='ph--sidebar-simple--regular'
      size={inR0 ? 5 : 4}
      tooltipSide={inR0 ? 'left' : undefined}
    />
  );
};
