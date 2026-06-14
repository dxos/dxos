//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';
import { PLUGIN_ENTRY_FILENAME } from '@dxos/protocols';

/**
 * Default port the Vite plugin (`composerPlugin`) binds the dev server to.
 *
 * Shared single source of truth — `composerPlugin` reads it as the default
 * port, and the host's "Load Dev Plugin" affordance pre-fills the manifest URL
 * with `http://localhost:${PLUGIN_DEV_SERVER_PORT}/manifest.json`. Lives in
 * app-framework rather than `@dxos/protocols` because the constant is a
 * client-side convention (host loader + Vite plugin) rather than a wire-level
 * protocol.
 */
export const PLUGIN_DEV_SERVER_PORT = 3967;

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
 * Production manifests are published as a sibling of the plugin's entry module
 * ({@link PLUGIN_ENTRY_FILENAME}) and advertise every file the plugin needs at
 * runtime so the host can eagerly cache them for offline use.
 *
 * Dev manifests (served by `vite dev` via {@link composerPlugin}) set `devEntry`
 * to point at the unbundled source entry. The host's loader treats the presence
 * of `devEntry` as the dev-mode signal: it imports the entry directly from the
 * dev server, skips eager asset caching, and skips static stylesheet injection
 * (Vite handles CSS via runtime `<style>` injection during HMR). `assets` is not
 * required to enumerate every file in dev mode — chunks and styles flow through
 * the dev server on demand.
 */
export const Manifest = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  version: Schema.String,
  assets: Schema.Array(Schema.String),
  devEntry: Schema.String.pipe(Schema.optional),
  /**
   * The plugin's declared dependencies resolved to concrete installed versions at
   * build time. The host derives SDK compatibility from the `@dxos/*` subset it
   * shares with the plugin. Optional — absent means "unknown" (legacy plugin).
   */
  dependencies: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
});

export type Manifest = Schema.Schema.Type<typeof Manifest>;

/**
 * Resolved manifest with all asset paths converted to absolute URLs.
 *
 * `dev` reflects whether the source manifest declared a `devEntry`. Loaders branch
 * on this to skip offline caching and stylesheet injection — both are no-ops (or
 * actively wrong) when the plugin is being served by a Vite dev server.
 */
export type ResolvedManifest = {
  id: string;
  name: string;
  version: string;
  entryUrl: string;
  assetUrls: readonly string[];
  dev: boolean;
  /** Resolved build-time dependency versions (see {@link Manifest.dependencies}). */
  dependencies?: Record<string, string>;
};

/**
 * Resolves a parsed manifest's relative asset paths against the manifest's URL.
 * In dev mode the entry comes from `devEntry`; otherwise it's the canonical
 * {@link PLUGIN_ENTRY_FILENAME} sitting next to the manifest.
 */
const resolve = (manifestUrl: string, manifest: Manifest): ResolvedManifest => {
  const dev = manifest.devEntry !== undefined;
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    entryUrl: new URL(dev ? manifest.devEntry! : PLUGIN_ENTRY_FILENAME, manifestUrl).toString(),
    assetUrls: manifest.assets.map((asset) => new URL(asset, manifestUrl).toString()),
    dev,
    ...(manifest.dependencies !== undefined ? { dependencies: manifest.dependencies } : {}),
  };
};

/**
 * Synchronous decode + validate + resolve for an in-memory manifest payload. Used
 * by tests and tooling that have the manifest body already loaded; the runtime
 * path goes through {@link fetchManifest}.
 */
export const parse = (manifestUrl: string, payload: unknown): ResolvedManifest => {
  const manifest = Schema.decodeUnknownSync(Manifest)(payload);
  if (manifest.devEntry === undefined && !manifest.assets.includes(PLUGIN_ENTRY_FILENAME)) {
    throw new Error(`Manifest at ${manifestUrl} does not list ${PLUGIN_ENTRY_FILENAME} in assets.`);
  }
  return resolve(manifestUrl, manifest);
};

/**
 * Fetches and parses a manifest from the given URL via Effect's HTTP client and
 * Schema-driven JSON decoding. All failure modes surface as a single tagged
 * {@link PluginManifestError}; callers route on `error.context.reason`.
 */
export const fetchManifest = (manifestUrl: string): Effect.Effect<ResolvedManifest, PluginManifestError> =>
  Effect.gen(function* () {
    const response = yield* HttpClientRequest.get(manifestUrl).pipe(
      HttpClient.execute,
      Effect.mapError((cause) => new PluginManifestError({ context: { manifestUrl, reason: 'fetch-failed' }, cause })),
    );
    if (response.status >= 400) {
      return yield* Effect.fail(
        new PluginManifestError({ context: { manifestUrl, reason: 'http-error', status: response.status } }),
      );
    }
    const manifest = yield* HttpClientResponse.schemaBodyJson(Manifest)(response).pipe(
      Effect.mapError((cause) => new PluginManifestError({ context: { manifestUrl, reason: 'parse-failed' }, cause })),
    );
    if (manifest.devEntry === undefined && !manifest.assets.includes(PLUGIN_ENTRY_FILENAME)) {
      return yield* Effect.fail(
        new PluginManifestError({
          context: { manifestUrl, reason: 'invalid' },
          cause: `assets does not include ${PLUGIN_ENTRY_FILENAME}`,
        }),
      );
    }
    return resolve(manifestUrl, manifest);
  }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer));
