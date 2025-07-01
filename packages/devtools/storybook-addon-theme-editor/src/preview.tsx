//
// Copyright 2025 DXOS.org
//

import { type Preview } from '@storybook/react';
import React, { memo } from 'react';
import { useGlobals } from 'storybook/preview-api';

import { Panel } from './components';
import { THEME_EDITOR_PARAM_KEY } from './defs';

const preview: Preview = {
  decorators: [
    (Story) => {
      const MemoizedStory = memo(Story);
      const [globals] = useGlobals();
      const isActive = !!globals[THEME_EDITOR_PARAM_KEY];
      return (
        <>
          <MemoizedStory />
          {isActive && <Panel />}
        </>
      );
    }
  ],

  initialGlobals: {
    [THEME_EDITOR_PARAM_KEY]: {
      enabled: false,
    },
  },
};

export default preview;
