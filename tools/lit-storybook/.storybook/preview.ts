//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { withThemeByClassName } from '@storybook/addon-themes';
import { type Decorator, type Preview } from '@storybook/web-components-vite';
import { html } from 'lit';

import { mx } from '@dxos/react-ui-theme';

const withLayout: Decorator = (Story, context) => {
  const {
    parameters: { layout },
  } = context;
  const { type, classNames, scroll } = typeof layout === 'object' ? layout : { type: layout };

  switch (type) {
    // Fullscreen.
    case 'fullscreen':
      return html`
        <div role="none" class="${mx('fixed inset-0 flex flex-col overflow-hidden bg-baseSurface', classNames)}">
          ${Story()}
        </div>
      `;

    // Centered column.
    case 'column':
      return html`
        <div role="none" class="fixed inset-0 flex justify-center overflow-hidden bg-deckSurface">
          <div
            role="none"
            class="${mx(
              'flex flex-col bs-full is-[40rem] bg-baseSurface border-is border-ie border-subduedSeparator',
              classNames,
              scroll ? 'overflow-y-auto' : 'overflow-hidden',
            )}"
          >
            ${Story()}
          </div>
        </div>
      `;

    // Centered.
    case 'centered':
      return html`
        <div role="none" class="fixed inset-0 grid place-items-center bg-deckSurface">
          <div role="none" class="${mx('contents bg-baseSurface', classNames)}">${Story()}</div>
        </div>
      `;

    default:
      return Story();
  }
};

/**
 * Configure Storybook rendering.
 * https://storybook.js.org/docs/configure#configure-story-rendering
 */
export const preview: Preview = {
  decorators: [
    // Note: Does not affect docs.
    withThemeByClassName({
      defaultTheme: 'dark',
      themes: {
        dark: 'dark',
        light: 'light',
      },
    }),

    withLayout,
  ],

  /**
   * Referenced when story is previewed in browser.
   * https://storybook.js.org/docs/writing-stories/parameters#global-parameters
   */
  parameters: {
    actions: {
      argTypesRegex: '^on.*',
    },
    backgrounds: {
      options: {},
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },

    // Disables Chromatic's snapshotting on a global level.
    chromatic: {
      disableSnapshot: true,
    },
  },
};

export default preview;
