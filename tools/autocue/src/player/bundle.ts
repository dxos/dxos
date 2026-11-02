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
    // Only a page or a manifest is a file; any other last segment (even a dotted one, `chess.v2`) is the folder.
    root.pathname = /\.(html?|json)$/i.test(root.pathname) ? root.pathname.replace(/[^/]*$/, '') : `${root.pathname}/`;
  }
  root.search = '';
  root.hash = '';
  return root;
};

/** The manifest for `url`: a `.json` URL as given (whatever its name), else `autocue.json` at the bundle root. */
export const manifestOf = (url: string | URL): string =>
  /\.json$/i.test(new URL(url).pathname) ? new URL(url).href : new URL(MANIFEST_FILE, bundleRoot(url)).href;

/** `path` resolved against `base`; only `http:` and `https:` are allowed, since the player renders them as links. */
const webUrl = (path: string | URL, base?: string | URL): string => {
  const url = new URL(path, base);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError(`unsupported URL scheme: ${url.protocol}`);
  }
  return url.href;
};

/**
 * Rewrites the bundle-relative paths of `manifest` against `root`, so the player can run on a page that is not the
 * bundle's own `index.html`.
 */
export const rebaseManifest = (manifest: Manifest, root: string | URL): Manifest => {
  const absolute = (path: string) => webUrl(path, root);
  return {
    ...manifest,
    hosted: webUrl(manifest.hosted ?? root),
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

const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;

const isDemo = (value: unknown) =>
  isObject(value) &&
  'videos' in value &&
  Array.isArray(value.videos) &&
  value.videos.every((video) => isObject(video) && 'src' in video && typeof video.src === 'string') &&
  'chapters' in value &&
  Array.isArray(value.chapters) &&
  'recording' in value &&
  isObject(value.recording);

const isManifest = (value: unknown): value is Manifest =>
  isObject(value) &&
  'format' in value &&
  value.format === 'autocue@1' &&
  'demos' in value &&
  Array.isArray(value.demos) &&
  value.demos.every(isDemo);

/**
 * Fetches the manifest of the autocue bundle at `url` (its folder, `index.html` or manifest) and rebases its
 * paths so the player can play it from any page. The host must allow the page's origin (dx.pub does).
 */
export const loadBundle = (url: string): Effect.Effect<Manifest, BundleError> =>
  Effect.gen(function* () {
    const { root, manifestUrl } = yield* Effect.try({
      try: () => ({ root: bundleRoot(url), manifestUrl: manifestOf(url) }),
      catch: () => new BundleError({ url, reason: 'not a valid URL' }),
    });
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
    return yield* Effect.try({
      try: () => rebaseManifest(value, root),
      catch: (error) => fail(error instanceof Error ? error.message : String(error)),
    });
  });
