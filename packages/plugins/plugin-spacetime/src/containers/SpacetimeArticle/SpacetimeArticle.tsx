//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Panel } from '@dxos/react-ui';
import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';

import { SpacetimeEditor } from '../../components';

export type SpacetimeArticleProps = ObjectSurfaceProps<any>;

export const SpacetimeArticle = ({ role }: SpacetimeArticleProps) => {
  return (
    <Panel.Root>
      <Panel.Content asChild>
        <SpacetimeEditor />
      </Panel.Content>
    </Panel.Root>
  );
};
