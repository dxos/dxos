//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Flex, Panel } from '@dxos/react-ui';

import { SpacetimeEditor } from '#components';
import { type Scene } from '#types';

export type SpacetimeArticleProps = AppSurface.ObjectArticleProps<Scene.Scene>;

export const SpacetimeArticle = ({ subject, attendableId, role }: SpacetimeArticleProps) => {
  // Section embeds (e.g. transcluded in a markdown document) render the scene inline in a constrained
  // box rather than filling the plank; the canvas needs an explicit height to lay out.
  if (role === AppSurface.Section.role) {
    return (
      <SpacetimeEditor.Root scene={subject}>
        <Flex classNames='aspect-square'>
          <SpacetimeEditor.Canvas />
        </Flex>
      </SpacetimeEditor.Root>
    );
  }

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
