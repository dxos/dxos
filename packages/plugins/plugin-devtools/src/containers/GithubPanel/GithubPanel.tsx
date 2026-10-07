//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Layout from '@dxos/react-ui/Layout';

import { GithubComponent } from './GithubComponent.tsx';

export const GithubPanel = () => (
  <GithubComponent.Root>
    <Layout.Grid rows={['auto', 'fill', 'auto']} classNames='dx-fill overflow-hidden'>
      <GithubComponent.Header />
      <GithubComponent.Content />
      <GithubComponent.StatusBar />
    </Layout.Grid>
  </GithubComponent.Root>
);

GithubPanel.displayName = 'GithubPanel';
