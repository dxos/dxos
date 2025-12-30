//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Common, createIntent } from '@dxos/app-framework';
import { useCapability, useIntentDispatcher } from '@dxos/app-framework/react';
import { IconButton, type IconButtonProps, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { getCompanionId, useDeckCompanions } from '../../hooks';
import { meta } from '../../meta';
import { DeckCapabilities } from '../../types';

export const ToggleSidebarButton = ({
  classNames,
  variant = 'ghost',
}: ThemedClassName<Pick<IconButtonProps, 'variant'>>) => {
  const layoutContext = useCapability(DeckCapabilities.MutableDeckState);
  const { t } = useTranslation(meta.id);
  return (
    <IconButton
      variant={variant}
      icon='ph--sidebar--regular'
      iconOnly
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
      icon='ph--caret-line-left--regular'
      iconOnly
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
    const subject = layoutContext.complementarySidebarPanel ?? (companions[0] && getCompanionId(companions[0].id));
    if (layoutContext.complementarySidebarState === 'expanded' && !current && subject) {
      await dispatch(
        createIntent(Common.LayoutAction.UpdateComplementary, {
          part: 'complementary',
          subject,
        }),
      );
    }
  }, [layoutContext, current, companions, dispatch]);

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
