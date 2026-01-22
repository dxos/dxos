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

export type BannerProps = {
  node?: Node.Node;
};

export const Banner = ({ node }: BannerProps) => {
  const { t } = useTranslation(meta.id);
  const layout = useCapability(SimpleLayoutState);
  const { invokePromise } = useOperationInvoker();
  const label = node ? toLocalizedString(node.properties.label, t) : t('current app name', { ns: 'appkit' });

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
    // TODO(burdon): Fixed or not?
    <header
      className={mx(
        '_fixed flex items-center gap-2 pli-2 block-start-0 inset-inline-0 bg-baseSurface border-be border-separator',
        'pbs-[env(safe-area-inset-top)] bs-[calc(env(safe-area-inset-top)+var(--dx-mobile-topbar-content-height,48px))]',
        'grid grid-cols-[min-content_1fr_min-content]',
        surfaceZIndex({ level: 'menu' }),
      )}
    >
      {node ? (
        <IconButton
          iconOnly
          variant='ghost'
          icon='ph--caret-left--regular'
          label={t('back label')}
          onClick={handleClick}
        />
      ) : (
        <div />
      )}
      <h1 className={'grow text-center truncate font-medium'}>{label}</h1>
      {/* TODO(burdon): Menu. */}
    </header>
  );
};
