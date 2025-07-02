//
// Copyright 2025 DXOS.org
//

import { type Preview } from '@storybook/react';
import React, { memo } from 'react';
import { useGlobals } from 'storybook/preview-api';

import { log } from '@dxos/log';
import { type ThemeMode, ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { THEME_EDITOR_PARAM_KEY } from './defs';

const preview: Preview = {
  decorators: [
    (Story, { globals: { theme }, parameters: { translations } }) => {
      const MemoizedStory = memo(Story);
      const [globals] = useGlobals();
      const isActive = !!globals[THEME_EDITOR_PARAM_KEY];
      log('theme-editor', { isActive });
      // TODO(burdon): Add other default providers here?
      return (
        <ThemeProvider tx={defaultTx} themeMode={theme as ThemeMode} resourceExtensions={translations} noCache>
          <Tooltip.Provider>
            <MemoizedStory />
          </Tooltip.Provider>
        </ThemeProvider>
      );
    },
  ],

  initialGlobals: {
    [THEME_EDITOR_PARAM_KEY]: {
      enabled: false,
    },
  },
};

export default preview;
