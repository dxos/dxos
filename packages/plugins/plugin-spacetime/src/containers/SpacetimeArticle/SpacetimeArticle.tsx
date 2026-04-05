//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { Panel } from '@dxos/react-ui';

import { SpacetimeEditor } from '../../components';
import { type Scene, type Settings } from '../../types';

export type SpacetimeArticleProps = ObjectSurfaceProps<
  Scene.Scene,
  {
    settings?: Settings.Settings | null;
  }
>;

export const SpacetimeArticle = ({ role, subject, settings }: SpacetimeArticleProps) => {
  // TODO(burdon): Settings atom.

  return (
    <SpacetimeEditor.Root scene={subject}>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <SpacetimeEditor.Toolbar />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <SpacetimeEditor.Canvas />
        </Panel.Content>
      </Panel.Root>
    </SpacetimeEditor.Root>
  );
};
