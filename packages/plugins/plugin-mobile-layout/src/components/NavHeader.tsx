//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { LayoutAction, createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { type Node } from '@dxos/plugin-graph';
import { IconButton, toLocalizedString, useTranslation } from '@dxos/react-ui';

import { MobileLayoutState } from '../capabilities';
import { meta } from '../meta';

export const navHeaderRoot =
  'fixed block-start-0 inset-inline-0 bs-[--dx-mobile-topbar-content-height] bg-groupSurface pbs-[--dx-mobile-topbar-padding-top] flex items-center gap-cardSpacingInline';

export const navHeaderButton =
  'bs-[--dx-mobile-topbar-content-height] aspect-square absolute block-start-0 inline-start-0 dx-focus-ring-inset';

export const navHeaderHeading = 'grow text-center truncate pli-[--dx-mobile-topbar-content-height]';

export const NavHeader = ({ node }: { node?: Node }) => {
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
    <nav className={navHeaderRoot}>
      <IconButton
        iconOnly
        variant='ghost'
        icon='ph--caret-left--regular'
        label={t('back label')}
        onClick={handleClick}
        classNames={navHeaderButton}
      />
      <h1 className={navHeaderHeading}>{label}</h1>
    </nav>
  );
};
