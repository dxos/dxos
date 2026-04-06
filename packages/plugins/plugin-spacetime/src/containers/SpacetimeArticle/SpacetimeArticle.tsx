//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { Panel } from '@dxos/react-ui';

import { SpacetimeEditor } from '../../components';
import { type Scene } from '#types';

export type SpacetimeArticleProps = ObjectSurfaceProps<Scene.Scene>;

export const SpacetimeArticle = ({ subject, attendableId }: SpacetimeArticleProps) => {
  return (
    <SpacetimeEditor.Root scene={subject}>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <SpacetimeEditor.Toolbar attendableId={attendableId} alwaysActive />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <SpacetimeEditor.Canvas />
        </Panel.Content>
      </Panel.Root>
    </SpacetimeEditor.Root>
  );
};
