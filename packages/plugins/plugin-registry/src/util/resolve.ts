//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Path from 'effect/Path';
import * as Schema from 'effect/Schema';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';

import { Config2, PLUGIN_ENTRY_FILENAME, PluginManifestSchema } from '@dxos/protocols';

import { type PluginRecord } from '../storage';
import { PluginInstallError } from './errors';

/** Filename of the manifest a published plugin bundle ships beside its entry. */
export const MANIFEST_FILENAME = 'manifest.json';

/**
 * The manifest as the CLI reads it. Relaxed from the published `PluginManifestSchema` on `assets`,
 * which a plugin built for local use need not enumerate.
 */
const Manifest = Schema.Struct({
  ...PluginManifestSchema.fields,
  assets: Schema.optional(Schema.Array(Schema.String)),
});

/** A `dx.config.ts` module's default export. */
const DxConfig = Schema.Struct({ plugin: Config2.Plugin });

/** True when the locator is an http(s) URL rather than a filesystem path. */
export const isUrl = (locator: string): boolean => {
  try {
    const { protocol } = new URL(locator);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

/** What `add` learned about a plugin before writing anything. */
export type Resolved = {
  record: PluginRecord;
  /** Absolute URLs of every file to download. Empty for a linked install. */
  assetUrls: readonly string[];
  /**
   * The manifest verbatim, persisted alongside the downloaded assets.
   *
   * Kept as the original text rather than re-serialized from the decoded value so fields this CLI
   * does not model survive the round trip.
   */
  manifest?: string;
};

/**
 * Resolves a local directory, preferring a built `manifest.json` over the plugin's `dx.config.ts`.
 *
 * The `dx.config.ts` fallback is what lets `add --dev <path>` work against a source checkout with
 * no build output and no served manifest: every in-repo plugin already derives its `meta` from
 * that file via `Plugin.getMetaFromConfig`, so it carries the same `Config2.Plugin` shape a
 * published manifest does.
 */
const resolveDirectory = (locator: string): Effect.Effect<Resolved, PluginInstallError, any> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const directory = path.resolve(locator);

    const manifestJson = yield* fs
      .readFileString(path.join(directory, MANIFEST_FILENAME))
      .pipe(Effect.catch(() => Effect.succeed(undefined)));
    if (manifestJson !== undefined) {
      const manifest = yield* Effect.try(() => JSON.parse(manifestJson)).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(Manifest)),
        Effect.mapError((cause) => new PluginInstallError({ context: { locator, reason: 'manifest-invalid' }, cause })),
      );
      const { assets: _assets, ...plugin } = manifest;
      const record: PluginRecord = { id: manifest.key, source: { kind: 'link', path: directory }, meta: plugin };
      return { record, assetUrls: [] };
    }

    const configPath = path.join(directory, 'dx.config.ts');
    const config = yield* Effect.tryPromise(() => import(/* @vite-ignore */ configPath)).pipe(
      Effect.flatMap((mod) => Schema.decodeUnknownEffect(DxConfig)(mod.default)),
      Effect.mapError((cause) => new PluginInstallError({ context: { locator, reason: 'no-manifest' }, cause })),
    );
    const record: PluginRecord = {
      id: config.plugin.key,
      source: { kind: 'link', path: directory },
      meta: config.plugin,
    };
    return { record, assetUrls: [] };
  });

/** Fetches a published manifest and lists the files to snapshot. */
const resolveUrl = (manifestUrl: string): Effect.Effect<Resolved, PluginInstallError, any> =>
  Effect.gen(function* () {
    const response = yield* HttpClientRequest.get(manifestUrl).pipe(
      HttpClient.execute,
      Effect.mapError(
        (cause) => new PluginInstallError({ context: { locator: manifestUrl, reason: 'fetch-failed' }, cause }),
      ),
    );
    if (response.status >= 400) {
      return yield* Effect.fail(
        new PluginInstallError({
          context: { locator: manifestUrl, reason: 'fetch-failed', status: response.status },
        }),
      );
    }
    // Read as text rather than `schemaBodyJson` so the body can be written into the install
    // directory as it was served.
    const body = yield* response.text.pipe(
      Effect.mapError(
        (cause) => new PluginInstallError({ context: { locator: manifestUrl, reason: 'fetch-failed' }, cause }),
      ),
    );
    const manifest = yield* Effect.try(() => JSON.parse(body)).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Manifest)),
      Effect.mapError(
        (cause) => new PluginInstallError({ context: { locator: manifestUrl, reason: 'manifest-invalid' }, cause }),
      ),
    );

    const { assets = [], ...plugin } = manifest;
    // The entry is always fetched, whether or not the manifest bothered to list it.
    const assetPaths = assets.includes(PLUGIN_ENTRY_FILENAME) ? assets : [PLUGIN_ENTRY_FILENAME, ...assets];
    const record: PluginRecord = {
      id: manifest.key,
      source: { kind: 'copy', origin: manifestUrl, version: manifest.version },
      meta: plugin,
    };
    return { record, assetUrls: assetPaths.map((asset) => new URL(asset, manifestUrl).toString()), manifest: body };
  }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer));

/**
 * Resolves a locator into the record `add` will persist.
 *
 * Nothing is imported: the metadata comes from a manifest or `dx.config.ts`, which is what lets
 * install stay a fetch-and-record step with `enable` as the first execution of plugin code.
 *
 * Only two of the four locator/mode combinations install today. A snapshot of a local directory
 * and a live install from a dev server are both expressible in this command's shape (that is why
 * `--dev` is a flag rather than a second verb) but neither has a consumer yet, so they are refused
 * with a message rather than half-built.
 */
export const resolveLocator = (
  locator: string,
  { dev }: { dev: boolean },
): Effect.Effect<Resolved, PluginInstallError, any> => {
  if (isUrl(locator)) {
    return dev
      ? Effect.fail(
          new PluginInstallError({
            message: `--dev expects a directory, not a URL: ${locator}. Install it without --dev, or point --dev at a checkout.`,
            context: { locator, reason: 'unsupported-locator' },
          }),
        )
      : resolveUrl(locator);
  }
  return dev
    ? resolveDirectory(locator)
    : Effect.fail(
        new PluginInstallError({
          message: `Installing from a path requires --dev: ${locator}. Without it the plugin would be snapshotted, which is not supported yet.`,
          context: { locator, reason: 'unsupported-locator' },
        }),
      );
};
