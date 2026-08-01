//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { GithubComponent } from './GithubComponent';

export const GithubPanel = () => (
  <GithubComponent.Root>
    <div className='h-full grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden h-full is-full'>
      <GithubComponent.Header />
      <GithubComponent.Content />
      <GithubComponent.StatusBar />
    </div>
  </GithubComponent.Root>
);

GithubPanel.displayName = 'GithubPanel';
