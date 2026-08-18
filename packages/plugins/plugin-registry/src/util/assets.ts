//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Path from 'effect/Path';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';

import { getPluginInstallPath } from '../storage';
import { PluginInstallError } from './errors';
import { MANIFEST_FILENAME, type PluginAsset } from './resolve';

/** A plugin bundle is a handful of small files; a stalled transfer must not hang `add` forever. */
const ASSET_TIMEOUT = '30 seconds';

/**
 * Downloads a plugin's files into `plugins/<id>/`, mirroring each asset's path relative to its
 * manifest so a bundle's internal imports resolve the same way they did when it was built.
 *
 * Every asset's URL and destination were checked against the manifest by `resolveAsset` before
 * reaching here, so this only fetches and writes.
 *
 * The manifest is written alongside them, so an installed plugin is self-describing on disk and
 * needs no network to say what it is: a snapshot ends up the same shape as a directory `add --dev`
 * would accept, and the install survives losing the profile's record.
 *
 * Writes into a sibling staging directory and swaps it in at the end: a half-downloaded install
 * that the loader would later try to import is worse than no install, and a failed `add` must
 * leave a previous version of the plugin intact.
 */
export const downloadAssets = ({
  id,
  baseUrl,
  assets,
  manifest,
}: {
  id: string;
  baseUrl: string;
  assets: readonly PluginAsset[];
  manifest?: string;
}): Effect.Effect<string, PluginInstallError, any> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const target = getPluginInstallPath(id);
    const staging = `${target}.staging`;

    yield* fs.remove(staging, { recursive: true }).pipe(Effect.catch(() => Effect.void));
    yield* fs
      .makeDirectory(staging, { recursive: true })
      .pipe(
        Effect.mapError(
          (cause) => new PluginInstallError({ context: { locator: baseUrl, reason: 'write-failed' }, cause }),
        ),
      );

    for (const asset of assets) {
      const response = yield* HttpClientRequest.get(asset.url).pipe(
        HttpClient.execute,
        Effect.timeout(ASSET_TIMEOUT),
        Effect.mapError(
          (cause) => new PluginInstallError({ context: { locator: asset.url, reason: 'fetch-failed' }, cause }),
        ),
      );
      if (response.status >= 400) {
        return yield* Effect.fail(
          new PluginInstallError({ context: { locator: asset.url, reason: 'fetch-failed', status: response.status } }),
        );
      }
      // Read as bytes, not text: a plugin bundle may ship a wasm module, a font or an image, and
      // decoding those as UTF-8 on the way to disk replaces every invalid sequence.
      const body = yield* response.arrayBuffer.pipe(
        Effect.timeout(ASSET_TIMEOUT),
        Effect.mapError(
          (cause) => new PluginInstallError({ context: { locator: asset.url, reason: 'fetch-failed' }, cause }),
        ),
      );

      const destination = path.join(staging, asset.path);
      yield* fs
        .makeDirectory(path.dirname(destination), { recursive: true })
        .pipe(
          Effect.mapError(
            (cause) => new PluginInstallError({ context: { locator: asset.url, reason: 'write-failed' }, cause }),
          ),
        );
      yield* fs
        .writeFile(destination, new Uint8Array(body))
        .pipe(
          Effect.mapError(
            (cause) => new PluginInstallError({ context: { locator: asset.url, reason: 'write-failed' }, cause }),
          ),
        );
    }

    if (manifest !== undefined) {
      yield* fs
        .writeFileString(path.join(staging, MANIFEST_FILENAME), manifest)
        .pipe(
          Effect.mapError(
            (cause) => new PluginInstallError({ context: { locator: baseUrl, reason: 'write-failed' }, cause }),
          ),
        );
    }

    yield* fs.remove(target, { recursive: true }).pipe(Effect.catch(() => Effect.void));
    yield* fs
      .rename(staging, target)
      .pipe(
        Effect.mapError(
          (cause) => new PluginInstallError({ context: { locator: baseUrl, reason: 'write-failed' }, cause }),
        ),
      );
    return target;
  }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer));

/** Deletes a copied plugin's install directory. Linked installs own no bytes here. */
export const removeAssets = (id: string): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.remove(getPluginInstallPath(id), { recursive: true }).pipe(Effect.catch(() => Effect.void));
  });
