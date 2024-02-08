//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';

import { useGraph } from '@braneframe/plugin-graph';
import { NavigationAction, parseIntentPlugin, Surface, useResolvePlugin } from '@dxos/app-framework';
import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { baseSurface, descriptionText, mx } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN } from '../meta';

export const SpaceMain = ({ space }: { space: Space }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const { graph } = useGraph();
  const node = graph.findNode(space.key.toHex());
  const intentPlugin = useResolvePlugin(parseIntentPlugin);

  useEffect(() => {
    if (node && node.children.length > 0 && intentPlugin) {
      void intentPlugin.provides.intent.dispatch({
        action: NavigationAction.ACTIVATE,
        data: { id: node.children[0].id },
      });
    }
  }, [node, intentPlugin]);

  if (node && node.children.length > 0) {
    return null;
  }

  return (
    <div
      role='none'
      className={mx(baseSurface, 'min-bs-screen is-full flex items-center justify-center p-8')}
      data-testid='composer.firstRunMessage'
    >
      <div role='none' className='grid place-items-center grid-rows-[min-content_min-content]'>
        <p
          role='alert'
          className={mx(
            descriptionText,
            'place-self-stretch border border-dashed border-neutral-400/50 rounded-lg text-center p-8 font-normal text-lg',
          )}
        >
          {t('first run message')}
        </p>
        <Surface role='keyshortcuts' />
      </div>
    </div>
  );
};
