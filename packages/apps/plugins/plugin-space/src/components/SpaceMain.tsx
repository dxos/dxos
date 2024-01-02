//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';

import { useGraph } from '@braneframe/plugin-graph';
import { LayoutAction, parseIntentPlugin, useResolvePlugin } from '@dxos/app-framework';
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
        action: LayoutAction.ACTIVATE,
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
      <p
        role='alert'
        className={mx(
          descriptionText,
          'border border-dashed border-neutral-400/50 rounded-lg flex items-center justify-center p-8 font-system-normal text-lg',
        )}
      >
        {t('first run message')}
      </p>
    </div>
  );
};
