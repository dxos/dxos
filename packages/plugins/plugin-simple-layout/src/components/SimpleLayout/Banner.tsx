//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Common } from '@dxos/app-framework';
import { useCapability, useOperationInvoker } from '@dxos/app-framework/react';
import { type Node } from '@dxos/plugin-graph';
import { IconButton, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { mx, surfaceZIndex } from '@dxos/ui-theme';

import { meta } from '../../meta';
import { SimpleLayoutState } from '../../types';

export const bannerRoot = mx(
  'fixed flex items-center gap-2 pli-2 block-start-0 inset-inline-0 bs-[--dx-mobile-topbar-content-height,48px] bg-baseSurface border-be border-separator',
  surfaceZIndex({ level: 'menu' }),
);

export const bannerButton = 'shrink-0';

export const bannerHeading = 'grow text-center truncate font-medium';

export type BannerProps = {
  node?: Node.Node;
};

export const Banner = ({ node }: BannerProps) => {
  const { t } = useTranslation(meta.id);
  const layout = useCapability(SimpleLayoutState);
  const { invokePromise } = useOperationInvoker();
  const label = node ? toLocalizedString(node.properties.label, t) : 'Unknown';

  const handleClick = useCallback(async () => {
    if (layout.active) {
      await invokePromise(Common.LayoutOperation.Close, { subject: [layout.active] });
    } else {
      await invokePromise(Common.LayoutOperation.SwitchWorkspace, { subject: 'default' });
    }
  }, [invokePromise, layout.active]);

  return (
    // Note that the HTML5 element `header` has a default role of `banner`, hence the name of this component.
    // It should not be confused with the `heading` role (elements h1-6).
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
