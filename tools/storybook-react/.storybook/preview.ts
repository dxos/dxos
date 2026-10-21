//
// Copyright 2022 DXOS.org
//

import './suppress-storybook-deprecation-warnings.ts';

import { installSelfHeal } from './self-heal.ts';

installSelfHeal();

// Suppress Lit dev mode warning (https://lit.dev/msg/dev-mode).
// Pre-populating this set prevents Lit from issuing the warning on load.
(globalThis as any).litIssuedWarnings ??= new Set();
(globalThis as any).litIssuedWarnings.add('dev-mode');

import '@dxos-theme';
import './cubes.css';

import { withThemeByClassName } from '@storybook/addon-themes';
import { type Preview } from '@storybook/react-vite';
import { configure } from 'storybook/test';

// Next components style through `.dx-*` rules that ship separately from the theme.
import '@dxos/react-ui/theme.css';
import { StorybookErrorFallback } from '@dxos/storybook-addon-logger/StorybookErrorFallback';

import { docsTheme } from './theme.tsx';

// Restores the "Download logs" action on a crashed story.
globalThis.__STORY_ERROR_FALLBACK__ = StorybookErrorFallback;

// A play starts while its story is still booting (a client, a space, wasm), which takes longer than
// testing-library's 1 s default for `findBy*` and `waitFor` on CI's 4 vCPU runners.
configure({ asyncUtilTimeout: 5_000 });

/**
 * Configure Storybook rendering.
 * https://storybook.js.org/docs/configure#configure-story-rendering
 *
 * NOTE: Do not depend on @dxos/storybook-utils in the root storybook config due to circular dependencies.
 */
export const preview: Preview = {
  // Under `perfBundlePlugin` automerge does no wasm work at import, so the page realm initializes it
  // before any story runs; imported dynamically to keep it out of the `storybook dev` graph.
  beforeAll: async () => {
    if (typeof __DX_PERF_BUNDLE__ !== 'undefined') {
      const { initEchoHostWasm } = await import('./automerge-wasm.ts');
      await initEchoHostWasm();
    }
  },

  // NOTE: Does not affect docs.
  decorators: [
    withThemeByClassName({
      defaultTheme: 'dark',
      themes: {
        dark: 'dark',
        light: 'light',
      },
    }),
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
      disable: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      inlineStories: true,
      // TODO(burdon): Move from storybook-utils.
      // container: DocsContainer,
      theme: docsTheme,
      source: {
        type: 'code',
      },
    },

    options: {
      // This must be defined inline and may not include TS type defs.
      // https://storybook.js.org/docs/api/parameters#optionsstorysort
      // https://storybook.js.org/docs/writing-stories/naming-components-and-hierarchy#sorting-stories
      // @ts-ignore
      // Within a folder, subfolders come before components, then each group sorts by name; a component's stories keep
      // their order in the file, its docs first.
      storySort: (a, b) => {
        if (a.title === b.title) {
          return a.type === 'docs' && b.type !== 'docs' ? -1 : b.type === 'docs' && a.type !== 'docs' ? 1 : 0;
        }
        const left = a.title.split('/');
        const right = b.title.split('/');
        for (let index = 0; index < Math.min(left.length, right.length); index++) {
          if (left[index] === right[index]) {
            continue;
          }
          const leftFolder = index < left.length - 1;
          const rightFolder = index < right.length - 1;
          if (leftFolder !== rightFolder) {
            return leftFolder ? -1 : 1;
          }
          return left[index].localeCompare(right[index], undefined, { numeric: true, sensitivity: 'base' });
        }
        return left.length - right.length;
      },
    },
  },
};

export default preview;
