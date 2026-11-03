//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as HttpClient from 'effect/http/HttpClient';
import * as HttpClientRequest from 'effect/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/http/HttpClientResponse';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { BaseError } from '@dxos/errors';
import { DXN } from '@dxos/keys';
import { Config2, PLUGIN_ENTRY_FILENAME, PluginManifestSchema } from '@dxos/protocols';

import type * as Plugin from './plugin.ts';

/**
 * Default port the Vite plugin (`composerPlugin`) binds the dev server to.
 *
 * Shared single source of truth — `composerPlugin` reads it as the default
 * port, and the host's "Load Dev Plugin" affordance pre-fills the manifest URL
 * with `http://localhost:${DEV_SERVER_PORT}/manifest.json`. Lives in
 * app-framework rather than `@dxos/protocols` because the constant is a
 * client-side convention (host loader + Vite plugin) rather than a wire-level
 * protocol.
 */
export const DEV_SERVER_PORT = 3967;

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
const ActivationEventSchema = Schema.Struct({ id: DXN.Schema, specifier: Schema.optional(Schema.String) });

/** One module of a library build's manifest: a `Plugin.ManifestModule` as JSON. */
const ManifestModuleSchema = Schema.Struct({
  id: Schema.String,
  url: Schema.String,
  activatesOn: Schema.optional(
    Schema.Union([
      ActivationEventSchema,
      Schema.Struct({ type: Schema.Literal('one-of'), events: Schema.mutable(Schema.Array(ActivationEventSchema)) }),
      Schema.Struct({ type: Schema.Literal('all-of'), events: Schema.mutable(Schema.Array(ActivationEventSchema)) }),
    ]),
  ),
  requires: Schema.Array(Schema.Struct({ identifier: Schema.String, arity: Schema.Literals(['single', 'multi']) })),
  provides: Schema.Array(Schema.Struct({ identifier: Schema.String, arity: Schema.Literals(['single', 'multi']) })),
  adapter: Schema.optional(Schema.Struct({ url: Schema.String, args: Schema.optional(Schema.Unknown) })),
  environments: Schema.optional(Schema.Array(Schema.String)),
});

export const Manifest = Schema.Struct({
  // Reuse the build manifest field definitions from `@dxos/protocols` (the shape `composerPlugin`
  // emits), minus `assets` which we relax below, plus the dev-only `devEntry`.
  ...PluginManifestSchema.mapFields((fields) => Struct.omit(fields, ['assets'])).fields,
  /**
   * Relative asset paths. Relaxed vs the build `PluginManifestSchema` (which requires >= 1) because
   * dev-server manifests list no assets — chunks/styles flow through the dev server on demand.
   */
  assets: Schema.Array(Schema.String),
  /** Present only for dev-server manifests; points at the unbundled source entry. */
  devEntry: Schema.optional(Schema.String),
  /**
   * Every module of a `Plugin.config` plugin, with its body's URL relative to the manifest. A host builds the plugin from
   * these alone; a manifest without them (a plugin built from `src/plugin.tsx`) is loaded through its entry module.
   */
  modules: Schema.optional(Schema.Array(ManifestModuleSchema)),
});

export type Manifest = Schema.Schema.Type<typeof Manifest>;

/**
 * Resolved manifest with all asset paths converted to absolute URLs.
 *
 * `dev` reflects whether the source manifest declared a `devEntry`. Loaders branch
 * on this to skip offline caching and stylesheet injection — both are no-ops (or
 * actively wrong) when the plugin is being served by a Vite dev server.
 */
export type ResolvedManifest = Pick<Manifest, 'key' | 'name' | 'version' | 'dependencies'> & {
  entryUrl: string;
  assetUrls: readonly string[];
  dev: boolean;
  /** The plugin's definition, when the manifest lists its modules; module URLs stay relative to the manifest. */
  definition?: Plugin.Manifest;
};

/**
 * The plugin definition a manifest describes, or `undefined` when it lists no modules: its `Config2.Plugin` metadata,
 * which the manifest carries flat, and its modules.
 */
export const toDefinition = (manifest: Manifest): Plugin.Manifest | undefined =>
  manifest.modules === undefined
    ? undefined
    : { plugin: Schema.decodeUnknownSync(Config2.Plugin)(manifest), modules: manifest.modules };

/** Whether the manifest names a way to load the plugin: its modules, a dev entry, or the entry module in `assets`. */
const isLoadable = (manifest: Manifest): boolean =>
  manifest.modules !== undefined || manifest.devEntry !== undefined || manifest.assets.includes(PLUGIN_ENTRY_FILENAME);

/**
 * Resolves a parsed manifest's relative asset paths against the manifest's URL.
 * In dev mode the entry comes from `devEntry`; otherwise it's the canonical
 * {@link PLUGIN_ENTRY_FILENAME} sitting next to the manifest.
 */
const resolve = (manifestUrl: string, manifest: Manifest): ResolvedManifest => {
  const dev = manifest.devEntry !== undefined;
  return {
    key: manifest.key,
    name: manifest.name,
    version: manifest.version,
    entryUrl: new URL(dev ? manifest.devEntry! : PLUGIN_ENTRY_FILENAME, manifestUrl).toString(),
    assetUrls: manifest.assets.map((asset) => new URL(asset, manifestUrl).toString()),
    dev,
    ...(dev ? {} : { definition: toDefinition(manifest) }),
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
  if (!isLoadable(manifest)) {
    throw new Error(`Manifest at ${manifestUrl} lists no modules and no ${PLUGIN_ENTRY_FILENAME} in assets.`);
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
    if (!isLoadable(manifest)) {
      return yield* Effect.fail(
        new PluginManifestError({
          context: { manifestUrl, reason: 'invalid' },
          cause: `lists no modules and assets does not include ${PLUGIN_ENTRY_FILENAME}`,
        }),
      );
    }
    return resolve(manifestUrl, manifest);
  }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer));
