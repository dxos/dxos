//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { DensityProvider } from '@dxos/react-ui';

import { Splitter, SplitterSelector, type View } from './Splitter';

const Story = () => {
  const [view, setView] = useState<View>();
  return (
    <div>
      <DensityProvider density='fine'>
        <SplitterSelector view={view} onChange={setView} />
      </DensityProvider>
      <Splitter view={view}>
        <div>1</div>
        <div>2</div>
      </Splitter>
    </div>
  );
};

export default {
  title: 'plugin-script/Splitter',
  component: Splitter,
  render: Story,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
