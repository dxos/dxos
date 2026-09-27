//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Blob, Database, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { File, Video } from '@dxos/types';

//
// Media procured from dxos/dxos pull requests: the screenshots and demo recordings their authors
// linked from the PR body. Screenshots are SHA-pinned `raw.githubusercontent.com` URLs, so they
// survive the source branch being deleted and are served with `Access-Control-Allow-Origin: *`.
//

/** Resolves a URL to its bytes; `undefined` when unreachable. Injected so a headless build needs no network. */
export type AssetLoader = (url: string) => Promise<Uint8Array | undefined>;

/** Fetches over HTTP, treating any failure as unavailable so an offline apply still produces the space. */
export const fetchAsset: AssetLoader = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      log.warn('sample asset unavailable', { url, status: response.status });
      return undefined;
    }
    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    log.warn('sample asset unavailable', { url, error });
    return undefined;
  }
};

const R2 = 'https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos';

export type ImageKey = 'railBefore' | 'railAfter' | 'oauthIdle' | 'oauthPending';

const IMAGE_SEEDS: ReadonlyArray<SampleSpace.Seed<ImageKey, { name: string; url: string }>> = [
  {
    key: 'railBefore',
    name: 'l0-rail-before.png',
    url: 'https://raw.githubusercontent.com/dxos/dxos/97e185d31046b60ee0e130bdc86553de98f356f8/.pr-assets/l0-before.png',
  },
  {
    key: 'railAfter',
    name: 'l0-rail-after.png',
    url: 'https://raw.githubusercontent.com/dxos/dxos/97e185d31046b60ee0e130bdc86553de98f356f8/.pr-assets/l0-after.png',
  },
  {
    key: 'oauthIdle',
    name: 'oauth-idle.png',
    url: 'https://raw.githubusercontent.com/dxos/dxos/f186f44ee72b4c4b7508b4f3f6a97f3957704c84/packages/plugins/plugin-onboarding/assets/oauth-idle.png',
  },
  {
    key: 'oauthPending',
    name: 'oauth-pending.png',
    url: 'https://raw.githubusercontent.com/dxos/dxos/f186f44ee72b4c4b7508b4f3f6a97f3957704c84/packages/plugins/plugin-onboarding/assets/oauth-pending.png',
  },
];

export type VideoKey = 'toastCountdown' | 'haloLogin' | 'archify';

// Recordings stay URL-based `Video` objects: the R2 bucket sends no CORS header, so the bytes cannot
// be read into a blob from the browser, while the player embeds the URL directly.
const VIDEO_SEEDS: ReadonlyArray<SampleSpace.Seed<VideoKey, { name: string; url: string; description: string }>> = [
  {
    key: 'toastCountdown',
    name: 'Toast countdown demo',
    url: `${R2}/2026-09-04-toast-countdown/toast-countdown.webm`,
    description: 'A toast counting down its remaining time in a bar, pausing on hover (dxos/dxos#12954).',
  },
  {
    key: 'haloLogin',
    name: 'Switch identity in place — login',
    url: `${R2}/2026-09-23-halo-in-place-identity/halo-login.webm`,
    description: 'Logging in to another identity without a reset and reload (dxos/dxos#13336).',
  },
  {
    key: 'archify',
    name: 'Archify diagrams demo',
    url: `${R2}/2026-09-04-plugin-archify/archify-final.webm`,
    description: 'Generating an architecture diagram of a package with Archify (dxos/dxos#12952).',
  },
];

export type MediaResult = {
  images: Record<ImageKey, File.File>;
  videos: Record<VideoKey, Video.Video>;
};

/**
 * Images become `File`s whose blob holds the bytes inline, which every client can render without a
 * storage backend. An image the loader cannot reach keeps its source URL as an external blob, so the
 * space is still complete and the file says where it came from.
 */
export const makeMedia = (loadAsset: AssetLoader): SampleSpace.Phase<MediaResult> =>
  SampleSpace.phase('media', {
    schemas: [File.File, Blob.Blob, Video.Video],
    run: () =>
      Effect.gen(function* () {
        const images = yield* SampleSpace.seed(IMAGE_SEEDS, (seed) =>
          Effect.gen(function* () {
            const bytes = yield* Effect.promise(() => loadAsset(seed.url));
            const blob = yield* Database.add(
              Blob.make({
                type: 'image/png',
                size: bytes?.byteLength ?? 0,
                data: bytes ? Blob.inlineData(bytes) : Blob.externalData(seed.url),
              }),
            );
            return yield* Database.add(File.make({ name: seed.name, data: Ref.make(blob) }));
          }),
        );

        const videos = yield* SampleSpace.seed(VIDEO_SEEDS, (seed) =>
          Database.add(Video.make({ name: seed.name, url: seed.url, description: seed.description })),
        );

        return { images, videos };
      }),
  });
