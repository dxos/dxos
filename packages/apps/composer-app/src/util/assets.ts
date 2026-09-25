//
// Copyright 2026 DXOS.org
//

// Deliberately outside the `util` barrel, like `./cors`: the Worker imports this leaf directly, and
// the barrel re-exports modules that pull Automerge's wasm into the Worker bundle.

/**
 * Content-hashed build output, which vite emits flat in `/assets/`. Subdirectories there are copied
 * static trees (`/assets/plugin-tldraw/**`) whose filenames are stable across builds, so the
 * immutable header must not reach them — a year-long `max-age` on those would strand every existing
 * client on the icons and fonts it already has.
 */
const HASHED_ASSET_PATH = /^\/assets\/[^/]+$/;

/** A path naming a file rather than a client-side route, i.e. one carrying an extension. */
const FILE_PATH = /\.[a-zA-Z0-9]+$/;

/** For archive hits, which the Worker builds itself. Live assets get it from `public/_headers`; keep the two in step. */
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** Whether a path names build output that can never change under a client. */
export const isHashedAssetPath = (pathname: string): boolean => HASHED_ASSET_PATH.test(pathname);

/**
 * Whether a request no asset matched names a file, which gets a 404, rather than a client-side route,
 * which gets `index.html`. A navigation is always a route, so a route may contain a dot. A request with
 * no `Sec-Fetch-Mode` (curl, a non-browser client) counts as a subresource, so a probe sees the 404.
 */
export const isFileRequest = ({ pathname, secFetchMode }: { pathname: string; secFetchMode: string | null }): boolean =>
  secFetchMode !== 'navigate' && FILE_PATH.test(pathname) && !pathname.endsWith('.html');
