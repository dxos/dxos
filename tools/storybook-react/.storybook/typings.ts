//
// Copyright 2026 DXOS.org
//

/** Virtual CSS entry resolved at build time by `@dxos/ui-theme` ThemePlugin (`virtualFileId: '@dxos-theme'`). */
declare module '@dxos-theme';

/** Side-effect CSS imports in Storybook config (e.g. `./cubes.css`). */
declare module '*.css';

/** Read by `@dxos/app-framework`'s `withPluginManager`; declared here so the preview needs no import of it. */
// eslint-disable-next-line no-var
declare var __STORY_ERROR_FALLBACK__:
  | typeof import('@dxos/storybook-addon-logger/StorybookErrorFallback').StorybookErrorFallback
  | undefined;
