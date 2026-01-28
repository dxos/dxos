//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Common } from '@dxos/app-framework';
import { useOperationInvoker } from '@dxos/app-framework/react';
import { type Node } from '@dxos/plugin-graph';
import { IconButton, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { mx, osTranslations, surfaceZIndex } from '@dxos/ui-theme';

import { HOME_ID } from '../../capabilities/state';
import { useSimpleLayoutState } from '../../hooks';
import { meta } from '../../meta';

export type BannerProps = {
  node?: Node.Node;
};

export const Banner = ({ node }: BannerProps) => {
  const { t } = useTranslation(meta.id);
  const { state } = useSimpleLayoutState();
  const { invokePromise } = useOperationInvoker();
  const label = node ? toLocalizedString(node.properties.label, t) : t('current app name', { ns: osTranslations });

  const handleClick = useCallback(async () => {
    if (state.active) {
      await invokePromise(Common.LayoutOperation.Close, { subject: [state.active] });
    } else {
      await invokePromise(Common.LayoutOperation.SwitchWorkspace, { subject: HOME_ID });
    }
  }, [invokePromise, state.active]);

  return (
    // Note that the HTML5 element `header` has a default role of `banner`, hence the name of this component.
    // It should not be confused with the `heading` role (elements h1-6).
    // TODO(burdon): Fixed or not?
    <header
      className={mx(
        '_fixed flex items-center gap-2 pli-2 block-start-0 inset-inline-0 bs-[--dx-mobile-topbar-content-height,48px] bg-baseSurface border-be border-separator',
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
