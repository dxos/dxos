//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Panel } from '@dxos/react-ui';
import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';

import { SpacetimeEditor } from '../../components';

export type SpacetimeArticleProps = ObjectSurfaceProps<any>;

const SpacetimeArticle = ({ role }: SpacetimeArticleProps) => {
  return (
    <Panel.Root>
      <Panel.Content asChild>
        <SpacetimeEditor className='w-full h-full' />
      </Panel.Content>
    </Panel.Root>
  );
};

export default SpacetimeArticle;
