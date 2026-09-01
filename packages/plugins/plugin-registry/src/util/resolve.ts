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

import { type PluginRecord } from '../storage.ts';
import { PluginInstallError } from './errors.ts';

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

/** One file to download, already checked against the manifest that declared it. */
export type PluginAsset = {
  /** Absolute URL to fetch. */
  url: string;
  /** Where to write it, relative to the install directory. */
  path: string;
};

/** What `add` learned about a plugin before writing anything. */
export type Resolved = {
  record: PluginRecord;
  /** Every file to download. Empty for a linked install. */
  assets: readonly PluginAsset[];
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
      return { record, assets: [] };
    }

    // Only `--dev` on an unbuilt checkout reaches here, where reading the metadata means evaluating
    // the developer's own config module — the same bar as running the build that would emit a manifest.
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
    return { record, assets: [] };
  });

/** A manifest is a small JSON document; a server that has not sent it by now is not going to. */
const MANIFEST_TIMEOUT = '30 seconds';

/**
 * Resolves one manifest-declared asset against the URL the manifest was served from.
 *
 * The manifest is untrusted and `new URL(asset, base)` ignores the base for anything absolute, so
 * an asset is confined here to the same origin as its manifest and to a path at or below it —
 * which is what a published bundle looks like anyway.
 */
const resolveAsset = (asset: string, manifestUrl: string): Effect.Effect<PluginAsset, PluginInstallError> =>
  Effect.gen(function* () {
    const reject = (message: string) =>
      Effect.fail(new PluginInstallError({ message, context: { locator: asset, reason: 'manifest-invalid' } }));

    const base = new URL(manifestUrl);
    const url = yield* Effect.try(() => new URL(asset, base)).pipe(
      Effect.catch(() => reject(`Plugin asset is not a valid URL: ${asset}`)),
    );
    if (url.protocol !== base.protocol || url.origin !== base.origin) {
      return yield* reject(`Plugin asset is not served from the manifest's origin: ${asset}`);
    }

    // Everything up to and including the manifest's last slash; an asset must extend it.
    const directory = base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1);
    if (!url.pathname.startsWith(directory)) {
      return yield* reject(`Plugin asset resolves above its manifest: ${asset}`);
    }
    // Decoded because the path becomes a filename, then segment-checked because percent-encoding
    // hides traversal from `URL` — `..%5Cx` survives as one path-looking segment.
    const relative = yield* Effect.try(() => decodeURIComponent(url.pathname.slice(directory.length))).pipe(
      Effect.catch(() => reject(`Plugin asset path is not decodable: ${asset}`)),
    );
    // A backslash is a separator on Windows, so it must be rejected rather than treated as a name.
    const segments = relative.split('/');
    if (relative.includes('\\') || segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
      return yield* reject(`Plugin asset does not name a file below its manifest: ${asset}`);
    }

    return { url: url.toString(), path: relative };
  });

/** Fetches a published manifest and lists the files to snapshot. */
const resolveUrl = (manifestUrl: string): Effect.Effect<Resolved, PluginInstallError, any> =>
  Effect.gen(function* () {
    const response = yield* HttpClientRequest.get(manifestUrl).pipe(
      HttpClient.execute,
      Effect.timeout(MANIFEST_TIMEOUT),
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
      Effect.timeout(MANIFEST_TIMEOUT),
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
    const assetList = yield* Effect.forEach(assetPaths, (asset) => resolveAsset(asset, manifestUrl));
    return { record, assets: assetList, manifest: body };
  }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer));

/**
 * Resolves a locator into the record `add` will persist.
 *
 * The plugin's entry module is never imported here: its metadata comes from a manifest, which is
 * what lets install stay a fetch-and-record step with `enable` as the first execution of plugin
 * code. The one exception is `--dev` against a checkout with no built manifest, which reads that
 * directory's `dx.config.ts` — see {@link resolveDirectory}.
 *
 * Two of the four locator/mode combinations are refused with a message rather than half-built:
 * both are expressible in this command's shape — which is why `--dev` is a flag and not a second
 * verb — but neither has a consumer yet.
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
