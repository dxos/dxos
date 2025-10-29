//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { LayoutAction, createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { type Node } from '@dxos/plugin-graph';
import { IconButton, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { mx, surfaceZIndex } from '@dxos/react-ui-theme';

import { MobileLayoutState } from '../capabilities';
import { meta } from '../meta';

export const bannerRoot = mx(
  'fixed block-start-0 inset-inline-0 bs-[--dx-mobile-topbar-content-height] bg-baseSurfaceOverlay pbs-[--dx-mobile-topbar-padding-top] flex items-center gap-cardSpacingInline backdrop-blur',
  surfaceZIndex({ level: 'menu' }),
);

export const bannerButton =
  'bs-[--dx-mobile-topbar-content-height] aspect-square absolute block-start-0 inline-start-0 dx-focus-ring-inset';

export const bannerHeading = 'grow text-center truncate pli-[--dx-mobile-topbar-content-height]';

export const Banner = ({ node }: { node?: Node }) => {
  const { t } = useTranslation(meta.id);
  const layout = useCapability(MobileLayoutState);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const label = node ? toLocalizedString(node.properties.label, t) : 'Unknown';

  const handleClick = useCallback(async () => {
    if (layout.active) {
      await dispatch(
        createIntent(LayoutAction.Close, { part: 'main', subject: [layout.active], options: { state: false } }),
      );
    } else {
      await dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: 'default' }));
    }
  }, [dispatch]);

  return (
    // Note that the HTML5 element `header` has a default role of `banner`, hence the name of this component. It should not be confused with the `heading` role (elements h1-6).
    <header className={bannerRoot}>
      <IconButton
        iconOnly
        variant='ghost'
        icon='ph--caret-left--regular'
        label={t('back label')}
        onClick={handleClick}
        classNames={bannerButton}
      />
      <h1 className={bannerHeading}>{label}</h1>
    </header>
  );
};
