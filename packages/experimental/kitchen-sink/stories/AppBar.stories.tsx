//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { FullScreen } from '@dxos/react-components';

import { AppBar, ViewType, ThemeProvider } from '../src/index.js';

export default {
  title: 'KitchenSink/AppBar'
};

export const Primary = () => {
  const [view, setView] = useState<string>(ViewType.List);
  return (
    <FullScreen>
      <ThemeProvider>
        <AppBar
          view={view}
          onSearch={(text: string) => console.log('search:', text)}
          onSelection={(text: string) => console.log('selection:', text)}
          onExport={(action) => console.log('export:', action)}
          onChangeView={(view: string) => setView(view)}
        />
      </ThemeProvider>
    </FullScreen>
  );
};
