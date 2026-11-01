//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';

import { type Manifest } from './types.ts';

/** The manifest's file name at the bundle root, as `pack.mjs` writes it. */
export const MANIFEST_FILE = 'autocue.json';

/** The bundle root for `url`: the folder itself, or the folder of its `index.html` or `autocue.json`. */
export const bundleRoot = (url: string | URL): URL => {
  const root = new URL(url);
  if (!root.pathname.endsWith('/')) {
    root.pathname = /\.[a-z0-9]+$/i.test(root.pathname) ? root.pathname.replace(/[^/]*$/, '') : `${root.pathname}/`;
  }
  root.search = '';
  root.hash = '';
  return root;
};

/**
 * Rewrites the bundle-relative paths of `manifest` against `root`, so the player can run on a page that is not the
 * bundle's own `index.html`.
 */
export const rebaseManifest = (manifest: Manifest, root: string | URL): Manifest => {
  const absolute = (path: string) => new URL(path, root).href;
  return {
    ...manifest,
    hosted: manifest.hosted ?? new URL(root).href,
    archive: manifest.archive && absolute(manifest.archive),
    demos: manifest.demos.map((demo) => ({
      ...demo,
      poster: demo.poster && absolute(demo.poster),
      videos: demo.videos.map((video) => ({ ...video, src: absolute(video.src) })),
    })),
  };
};

/** Raised when a URL does not answer with an autocue bundle manifest. */
export class BundleError extends Data.TaggedError('BundleError')<{ url: string; reason: string }> {
  override get message() {
    return `${this.url}: ${this.reason}`;
  }
}

const isManifest = (value: unknown): value is Manifest =>
  typeof value === 'object' &&
  value !== null &&
  'format' in value &&
  value.format === 'autocue@1' &&
  'demos' in value &&
  Array.isArray(value.demos);

/**
 * Fetches the manifest of the autocue bundle at `url` (its folder, `index.html` or `autocue.json`) and rebases its
 * paths so the player can play it from any page. The host must allow the page's origin (dx.pub does).
 */
export const loadBundle = (url: string): Effect.Effect<Manifest, BundleError> =>
  Effect.gen(function* () {
    const root = bundleRoot(url);
    const manifestUrl = new URL(MANIFEST_FILE, root).href;
    const fail = (reason: string) => new BundleError({ url: manifestUrl, reason });
    const response = yield* Effect.tryPromise({
      try: (signal) => fetch(manifestUrl, { signal }),
      catch: (error) => fail(String(error)),
    });
    if (!response.ok) {
      return yield* fail(`${response.status} ${response.statusText}`.trim());
    }
    const value: unknown = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => fail('not JSON'),
    });
    if (!isManifest(value)) {
      return yield* fail('not an autocue@1 manifest');
    }
    return rebaseManifest(value, root);
  });
