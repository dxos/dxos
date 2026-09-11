//
// Copyright 2026 DXOS.org
//

// Per-channel brand artwork for the web bundle.
//
// Every non-production channel deploys as its own app on its own origin, and the desktop builds install
// side by side (see `.github/actions/cn-config`). Shared artwork makes those indistinguishable once
// they are open — the same tab favicon, the same mark on the boot screen — so each channel ships a
// recoloured mark. `pnpm icons:variants` generates them; this module decides which set a build uses.
//
// To see a channel's artwork, bundle with its environment and preview the output — `vite preview` serves
// `out/composer`:
//
//   DX_ENVIRONMENT=preview moon run composer-app:bundle && pnpm exec vite preview
//
// `moon run composer-app:serve` always shows production's, whatever `DX_ENVIRONMENT` says.

import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { type ConfigEnv, type PluginOption } from 'vite';

import { type Channel, CHANNELS, channelMarkFilter, isChannel } from '@dxos/brand/channels';

/** A prerelease channel — `@dxos/brand` owns the set and each one's colour; this module applies them to a build. */
export type ChannelVariant = Channel;

/**
 * Every icon the shell hands the browser — `index.html`'s `<link rel=icon>` set plus the two
 * `site.webmanifest` names. The manifest pair matters as much as the favicons: a browser picks the tab
 * and app icon from both, so leaving them blue shows the released mark next to the channel's own.
 * Replaced wholesale, so a variant set must carry all of them.
 */
const FAVICONS = [
  'apple-touch-icon.png',
  'favicon.ico',
  'favicon.svg',
  'favicon-96x96.png',
  'web-app-manifest-192x192.png',
  'web-app-manifest-512x512.png',
];

/**
 * Environments whose bundle reaches no one, so there is no channel to tell apart: the released app,
 * and CI's e2e bundle, which a test driver loads and nothing deploys.
 */
const UNBRANDED = ['production', 'ci'];

/**
 * The channel a deploy environment brands itself as, or undefined for the released app.
 * Only a bundle is branded — the variant marks a deployed channel, so a dev server showing one would
 * claim this build came from somewhere it did not. An environment this module does not know fails the
 * build: a prerelease shipping production's mark is the exact confusion the branding exists to prevent.
 */
export const channelVariant = (
  command: ConfigEnv['command'],
  environment = process.env.DX_ENVIRONMENT,
): ChannelVariant | undefined => {
  if (command !== 'build' || !environment || UNBRANDED.includes(environment)) {
    return undefined;
  }
  if (!isChannel(environment)) {
    throw new Error(`channel-branding: unknown environment: ${environment} (expected ${CHANNELS.join(' | ')})`);
  }
  return environment;
};

/**
 * The CSS filter that turns the released boot mark into the channel's, or undefined for the released
 * app. An SVG needs no generated copy to change colour: the loader applies this over the one mark.
 */
export const bootMarkFilter = (variant: ChannelVariant | undefined): string | undefined =>
  variant && channelMarkFilter(variant);

/**
 * Overwrite the favicons already emitted into `outDir` with the channel's own. No-op without a variant,
 * which is what a production or local build gets.
 */
export const applyChannelFavicons = (appDir: string, outDir: string, variant: ChannelVariant | undefined): void => {
  if (!variant) {
    return;
  }

  const source = path.join(appDir, 'assets', `favicons-${variant}`);
  for (const favicon of FAVICONS) {
    const from = path.join(source, favicon);
    if (!existsSync(from)) {
      // A half-generated variant would ship production's mark on a prerelease, which is the exact
      // confusion this exists to prevent — fail the build instead.
      throw new Error(`channel favicon missing: ${from} (run \`pnpm icons:variants\`)`);
    }
    copyFileSync(from, path.join(outDir, favicon));
  }
};

/**
 * Applies {@link applyChannelFavicons} to the build output.
 * Runs in `closeBundle` rather than `generateBundle`, since the favicons are `publicDir` files rather
 * than rollup assets and are copied outside the bundle hooks. Deliberately without `order: 'post'`, and
 * declared ahead of `VitePWA`: Workbox hashes these files off disk to build its precache manifest, so a
 * swap after that records the released icon's revision against the channel's file and the service worker
 * then serves whichever it cached first.
 */
export const channelFaviconPlugin = (appDir: string, variant: ChannelVariant | undefined): PluginOption => {
  let outDir: string;
  return {
    name: 'dxos-channel-favicon',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      applyChannelFavicons(appDir, outDir, variant);
      if (variant) {
        // eslint-disable-next-line no-console
        console.log(`dxos-channel-favicon: ${variant}`);
      }
    },
  };
};
