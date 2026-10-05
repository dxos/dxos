//
// Copyright 2026 DXOS.org
//

/**
 * How the chat stories are served: `preview` (the default) serves a static `storybook build`, so the
 * stages measure the bundled app; `DX_PERF_SERVER=dev` serves `storybook dev` for local iteration,
 * where boot also pays for Vite transforming and streaming every module unbundled.
 */
export const SERVING_MODE: 'preview' | 'dev' = process.env.DX_PERF_SERVER === 'dev' ? 'dev' : 'preview';

/** The preview gets its own port so a developer's `storybook dev` on 9009 is never mistaken for the build. */
export const PERF_PORT = SERVING_MODE === 'dev' ? 9009 : 9019;

/** Output of `storybook-react:bundle-perf`, relative to `tools/storybook-react`. */
export const PERF_STORYBOOK_OUT = 'out/storybook-perf';
