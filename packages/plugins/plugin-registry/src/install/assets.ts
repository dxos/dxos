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

/**
 * Downloads a plugin's files into `plugins/<id>/`, mirroring each asset's path relative to its
 * manifest so a bundle's internal imports resolve the same way they did when it was built.
 *
 * Writes into a sibling staging directory and swaps it in at the end: a half-downloaded install
 * that the loader would later try to import is worse than no install, and a failed `add` must
 * leave a previous version of the plugin intact.
 */
export const downloadAssets = ({
  id,
  baseUrl,
  assetUrls,
}: {
  id: string;
  baseUrl: string;
  assetUrls: readonly string[];
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

    const base = new URL(baseUrl);
    for (const assetUrl of assetUrls) {
      const relative = path.relative(path.dirname(base.pathname), new URL(assetUrl).pathname);
      // An asset resolving above its manifest would write outside the install directory.
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return yield* Effect.fail(
          new PluginInstallError({
            message: `Plugin asset escapes its install directory: ${assetUrl}`,
            context: { locator: assetUrl, reason: 'manifest-invalid' },
          }),
        );
      }

      const response = yield* HttpClientRequest.get(assetUrl).pipe(
        HttpClient.execute,
        Effect.mapError(
          (cause) => new PluginInstallError({ context: { locator: assetUrl, reason: 'fetch-failed' }, cause }),
        ),
      );
      if (response.status >= 400) {
        return yield* Effect.fail(
          new PluginInstallError({ context: { locator: assetUrl, reason: 'fetch-failed', status: response.status } }),
        );
      }
      const body = yield* response.text.pipe(
        Effect.mapError(
          (cause) => new PluginInstallError({ context: { locator: assetUrl, reason: 'fetch-failed' }, cause }),
        ),
      );

      const destination = path.join(staging, relative);
      yield* fs
        .makeDirectory(path.dirname(destination), { recursive: true })
        .pipe(
          Effect.mapError(
            (cause) => new PluginInstallError({ context: { locator: assetUrl, reason: 'write-failed' }, cause }),
          ),
        );
      yield* fs
        .writeFileString(destination, body)
        .pipe(
          Effect.mapError(
            (cause) => new PluginInstallError({ context: { locator: assetUrl, reason: 'write-failed' }, cause }),
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
