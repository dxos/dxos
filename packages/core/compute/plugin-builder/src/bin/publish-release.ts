#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/* eslint-disable no-console */

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import * as Schedule from 'effect/Schedule';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';

import { Context } from '@dxos/context';
import { EdgeHttpClient, formatPluginBundleLoad } from '@dxos/edge-client';
import { PluginLoader } from '@dxos/edge-compute/plugin-loader';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { EdgeCallFailedError } from '@dxos/protocols';

import { BUNDLE_DIR } from '../build-bundle.ts';
import { type BundleFile, withBuild } from '../build-version.ts';

/** Every file of the bundle, keyed by its `/`-separated path, as the registry's multipart upload takes it. */
const readBundleFiles = async (bundleDir: string): Promise<BundleFile[]> => {
  const files: BundleFile[] = [];
  for (const entry of (await readdir(bundleDir, { recursive: true })).sort()) {
    const full = join(bundleDir, entry);
    if ((await stat(full)).isFile()) {
      // Copied so the bytes own a plain `ArrayBuffer`, which is what a multipart `Blob` part takes.
      files.push({ path: entry.split(sep).join('/'), content: new Uint8Array(await readFile(full)) });
    }
  }
  return files;
};

/** One failed upload attempt; `cause` is what the EDGE client threw. */
class UploadFailedError extends Data.TaggedError('UploadFailedError')<{ readonly cause: unknown }> {}

/** Retries after the first attempt; with the backoff below they wait under half a minute in all. */
const UPLOAD_RETRIES = 3;

/**
 * A failure on EDGE's side (5xx, e.g. R2's transient `InternalError` 10001) or one before any response arrived.
 * Sending the upload again is safe: EDGE discards the files of a failed upload and writes the manifest last.
 */
const isTransientFailure = ({ cause }: UploadFailedError): boolean =>
  cause instanceof EdgeCallFailedError && (cause.status === undefined || cause.status >= 500);

const readManifest = async (bundleDir: string): Promise<{ key: string; version: string }> => {
  const { key, version } = JSON.parse(await readFile(join(bundleDir, PluginLoader.MANIFEST_FILE), 'utf8'));
  invariant(typeof key === 'string' && typeof version === 'string', `${bundleDir} has no manifest key and version`);
  return { key, version };
};

/**
 * Uploads a plugin package's EDGE bundle, built and checked by its `check-edge-release` task into
 * `<package>/dist/plugin`, to an EDGE registry as a first-party plugin, authenticated with the admin key in
 * `DX_HUB_API_KEY`. Prints one line: the plugin key, its version, and the result.
 *
 * A version is immutable on EDGE: re-uploading the same content succeeds, and a version that already holds other
 * content is reported as `stale` (a warning, not a failure) since only a version bump can publish it. An upload that
 * EDGE fails with a 5xx, or that gets no response, is sent again up to {@link UPLOAD_RETRIES} times.
 *
 * `--build <id>` (default `DX_PLUGIN_BUILD`) publishes the bundle as `<version>+<id>`, so a snapshot of `main` gets a
 * version of its own and moves `latest` instead of colliding with the release it was built from.
 *
 * Usage: `publish-release [--package <dir>] [--edge-url <url>] [--channel <name>] [--build <id>] [--dry-run]`;
 * `--edge-url` defaults to `DX_EDGE_BASE_URL`.
 */
const main = async () => {
  const { values } = parseArgs({
    options: {
      'package': { type: 'string' },
      'edge-url': { type: 'string' },
      'channel': { type: 'string' },
      'build': { type: 'string' },
      'dry-run': { type: 'boolean' },
    },
  });
  const bundleDir = join(resolve(values.package ?? process.cwd()), BUNDLE_DIR);
  const manifest = await readManifest(bundleDir);
  const { key } = manifest;
  const build = values.build ?? process.env.DX_PLUGIN_BUILD;
  const { version, files } = build
    ? withBuild(await readBundleFiles(bundleDir), manifest.version, build)
    : { version: manifest.version, files: await readBundleFiles(bundleDir) };
  const edgeUrl = values['edge-url'] ?? process.env.DX_EDGE_BASE_URL;
  const apiKey = process.env.DX_HUB_API_KEY;

  if (values['dry-run']) {
    console.log(`- ${key} ${version} dry-run: ${files.length} files to ${edgeUrl ?? '(no edge url)'}`);
    return;
  }
  invariant(edgeUrl, 'Set --edge-url or DX_EDGE_BASE_URL.');
  invariant(apiKey, 'Set DX_HUB_API_KEY to the EDGE admin key: first-party plugins are owned by the admin key.');

  const http = new EdgeHttpClient(edgeUrl, { apiKey });
  // `auth: false` skips the identity presentation, leaving the admin key as the only credential.
  const upload = Effect.tryPromise({
    try: () =>
      http.uploadPluginBundle(
        Context.default(),
        { slug: key, version, files, channel: values.channel },
        { auth: false },
      ),
    catch: (cause) => new UploadFailedError({ cause }),
  }).pipe(
    Effect.tapError((error) =>
      Effect.sync(() => {
        if (isTransientFailure(error)) {
          console.log(`! ${key} ${version} upload attempt failed on EDGE: ${String(error.cause)}`);
        }
      }),
    ),
  );
  const result = await EffectEx.runPromise(
    Effect.result(
      Effect.retry(upload, {
        schedule: Schedule.exponential('2 seconds').pipe(Schedule.jittered),
        times: UPLOAD_RETRIES,
        while: isTransientFailure,
      }),
    ),
  );

  if (Result.isSuccess(result)) {
    const { moduleUrl, edge } = result.success;
    const load = edge?.load ? ` (${formatPluginBundleLoad(edge.load)})` : '';
    console.log(`✓ ${key} ${version} published: ${moduleUrl}${load}`);
  } else {
    const error = result.failure.cause;
    if (error instanceof EdgeCallFailedError && error.data?.type === 'conflict') {
      const message = `${key} ${version} stale: EDGE holds other content for this version; bump it to publish`;
      console.log(`! ${message}`);
      if (process.env.GITHUB_ACTIONS) {
        console.log(`::warning::${message}`);
      }
      return;
    }
    console.error(`✗ ${key} ${version} failed`);
    throw error;
  }
};

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
