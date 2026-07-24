//
// Copyright 2023 DXOS.org
//

import './suppress-storybook-deprecation-warnings';

import React from 'react';
import { addons } from 'storybook/manager-api';

import { dxosTheme } from './theme';

// The manager UI is outside the app's theme, so the colour is inlined; this is the same accent blue
// the docs theme uses.
const PLAY_GLYPH_COLOR = '#1ea7fd';

/**
 * Referenced when story is previewed in browser.
 * UX state stored in Application/Storage/Local Storage: @storybook/manager/store
 * https://storybook.js.org/docs/configure/features-and-behavior
 */
addons.setConfig({
  enableShortcuts: true,
  theme: dxosTheme,
  sidebar: {
    // Opening a story with a play function runs its script and leaves the UI in a post-assertion
    // state, so it is not a clean starting point for hands-on testing; mark it in the sidebar.
    // `play-fn` is applied by the indexer, so nothing has to be annotated per story.
    renderLabel: (item) =>
      item.type === 'story' && item.tags?.includes('play-fn') ? (
        <span>
          <span style={{ color: PLAY_GLYPH_COLOR, marginInlineEnd: 6 }}>⏺</span>
          {item.name}
        </span>
      ) : (
        item.name
      ),
  },
});
