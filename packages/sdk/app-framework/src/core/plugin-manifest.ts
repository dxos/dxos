//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';
import { PLUGIN_ENTRY_FILENAME } from '@dxos/protocols';

/**
 * Tagged error for manifest fetch / parse failures. Construction sites set
 * `context.manifestUrl` and `context.reason` (one of `'fetch-failed' |
 * 'http-error' | 'parse-failed' | 'invalid'`) so handlers can route on the
 * specific failure mode.
 */
export class PluginManifestError extends BaseError.extend('PluginManifestError', 'Plugin manifest is invalid') {}

/**
 * Schema for a third-party plugin manifest.
 *
 * The manifest is published as a sibling of the plugin's entry module
 * ({@link PLUGIN_ENTRY_FILENAME}) and advertises every file the plugin needs at
 * runtime so the host can eagerly cache them for offline use.
 */
export const Manifest = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  version: Schema.String,
  assets: Schema.Array(Schema.String),
});

export type Manifest = Schema.Schema.Type<typeof Manifest>;

/**
 * Resolved manifest with all asset paths converted to absolute URLs.
 */
export type ResolvedManifest = {
  id: string;
  name: string;
  version: string;
  entryUrl: string;
  assetUrls: readonly string[];
};

/**
 * Parses and validates a manifest payload, then resolves all asset paths against the manifest URL.
 */
export const parse = (manifestUrl: string, payload: unknown): ResolvedManifest => {
  const manifest = Schema.decodeUnknownSync(Manifest)(payload);
  if (!manifest.assets.includes(PLUGIN_ENTRY_FILENAME)) {
    throw new Error(`Manifest at ${manifestUrl} does not list ${PLUGIN_ENTRY_FILENAME} in assets.`);
  }
  const entryUrl = new URL(PLUGIN_ENTRY_FILENAME, manifestUrl).toString();
  const assetUrls = manifest.assets.map((asset) => new URL(asset, manifestUrl).toString());
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    entryUrl,
    assetUrls,
  };
};

/**
 * Fetches and parses a manifest from the given URL. All failure modes surface as
 * a single tagged {@link PluginManifestError}; callers route on `error.context.reason`.
 */
export const fetchManifest = (manifestUrl: string): Effect.Effect<ResolvedManifest, PluginManifestError> =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => fetch(manifestUrl),
      catch: (cause) =>
        new PluginManifestError({ context: { manifestUrl, reason: 'fetch-failed' }, cause }),
    });
    if (!response.ok) {
      return yield* Effect.fail(
        new PluginManifestError({ context: { manifestUrl, reason: 'http-error', status: response.status } }),
      );
    }
    const payload = yield* Effect.tryPromise({
      try: () => response.json() as Promise<unknown>,
      catch: (cause) =>
        new PluginManifestError({ context: { manifestUrl, reason: 'parse-failed' }, cause }),
    });
    return yield* Effect.try({
      try: () => parse(manifestUrl, payload),
      catch: (cause) => new PluginManifestError({ context: { manifestUrl, reason: 'invalid' }, cause }),
    });
  });
