//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { GithubComponent } from './GithubComponent.tsx';

export const GithubPanel = () => (
  <GithubComponent.Root>
    <div className='dx-fill grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden'>
      <GithubComponent.Header />
      <GithubComponent.Content />
      <GithubComponent.StatusBar />
    </div>
  </GithubComponent.Root>
);

GithubPanel.displayName = 'GithubPanel';
