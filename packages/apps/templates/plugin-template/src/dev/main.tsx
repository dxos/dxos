//
// Copyright 2024 DXOS.org
//
import { plate } from '@dxos/plate';

import template from '../template.t';

export default template.define.script({
  // eslint-disable-next-line
  content: ({ input: { name }, imports }) => plate/* javascript */`
    import '@dxosTheme';
    import React from 'react';
    import { Status, ThemeProvider, Tooltip } from '@dxos/react-ui';
    import { createApp } from '@dxos/app-framework';
    import { createRoot } from 'react-dom/client';
    import plugin from '../src/plugin';

    const App = createApp({
      fallback: ({ error }) => (
        <ThemeProvider tx={defaultTx} resourceExtensions={translations}>
          <Tooltip.Provider>
            <ResetDialog error={error} config={config} />
          </Tooltip.Provider>
        </ThemeProvider>
      ),
      placeholder: (
        <ThemeProvider tx={defaultTx}>
          <div className='flex bs-[100dvh] justify-center items-center'>
            <Status indeterminate aria-label='Initializing' />
          </div>
        </ThemeProvider>
      ),
      plugins: {
        [plugin.meta.id]: plugin
      }
    });

    createRoot(document.getElementById('root')!).render(<App />);
  `,
});
