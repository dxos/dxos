#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Mirror an app's built `assets/` into its R2 retention bucket, so the previous build's chunks keep
// resolving after a deploy replaces the asset manifest.
//
// A `wrangler deploy` serves exactly one manifest: the moment a new version goes live, every chunk the
// previous build owned 404s, and a tab open across the deploy still imports them. `_worker.ts` falls back
// to the `ASSET_ARCHIVE` bucket on a miss; this is what puts anything there.
//
// Runs BEFORE the deploy (see deploy-env.mjs) so an upload failure stops the deploy rather than leaving a
// live version whose predecessors are unreachable.
//
// Talks to R2's S3 endpoint, as `packages/core/compute/edge-compute/scripts/upload-modules.mjs` does.
// Cloudflare's REST API rate-limits at roughly 4 requests a second (it 429s partway through a build), and
// `wrangler r2 object put` is one process per file. Needs CLOUDFLARE_ACCOUNT_ID plus an R2 API token
// (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY), which is not the Workers token.
//
// Usage: upload-assets.mjs <environment> [app|all]

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { execSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { assetArchiveBucket, resolveApps } from './apps.mjs';

/** Parallel uploads. Bounded because an unbounded fan-out over thousands of files exhausts sockets. */
const CONCURRENCY = 32;

const CONTENT_TYPES = {
  css: 'text/css',
  eot: 'application/vnd.ms-fontobject',
  html: 'text/html',
  js: 'text/javascript',
  json: 'application/json',
  m4a: 'audio/mp4',
  map: 'application/json',
  mjs: 'text/javascript',
  png: 'image/png',
  svg: 'image/svg+xml',
  ttf: 'font/ttf',
  wasm: 'application/wasm',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
};

const contentType = (name) => CONTENT_TYPES[name.split('.').pop()?.toLowerCase()] ?? 'application/octet-stream';

/**
 * Upload the flat files of `<outDir>/assets` to `bucket`, keyed as the Worker looks them up
 * (`/assets/foo-hash.js` → `assets/foo-hash.js`). Only the flat level is vite's content-hashed output;
 * subdirectories hold stable-named copies that must not be served as immutable, so they stay out.
 *
 * Unconditional: every file, every deploy, even one already present. R2 lifecycle rules expire by object
 * age, so a conditional upload would expire a chunk that has shipped for longer than the window WHILE IT
 * IS STILL LIVE. Re-uploading keeps a chunk until one window after the last build that contained it.
 */
const uploadAssets = async ({ client, bucket, outDir }) => {
  const entries = await readdir(join(outDir, 'assets'), { withFileTypes: true });
  const names = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  let next = 0;
  let failed;

  // The SDK retries throttling and 5xx itself, so one failure here is final.
  const worker = async () => {
    while (!failed && next < names.length) {
      const name = names[next++];
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: `assets/${name}`,
            Body: await readFile(join(outDir, 'assets', name)),
            ContentType: contentType(name),
          }),
        );
      } catch (error) {
        failed ??= new Error(`failed to upload assets/${name}: ${error?.message ?? error}`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (failed) {
    throw failed;
  }
  return names.length;
};

/**
 * Retain one app's built assets for <environment>. No-op for an app that declares no `ASSET_ARCHIVE`
 * binding there — assets-only apps have no Worker to serve a fallback, so retention is unreachable.
 */
export const retainAssets = async (root, app, environment) => {
  const bucket = assetArchiveBucket(root, app, environment);
  if (!bucket) {
    return;
  }

  const { CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!CLOUDFLARE_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    // Missing credentials are setup, not a transient failure: fail the deploy for them and every deploy
    // breaks until someone adds the secrets. Skip loudly instead; the Worker 404s as it did before.
    console.log(`::warning::Skipping asset retention for ${app.name} -> ${bucket}: R2 credentials are not set.`);
    return;
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });

  console.log(`::group::Retain ${app.name} assets -> ${bucket}`);
  const started = Date.now();
  const count = await uploadAssets({ client, bucket, outDir: join(root, app.outDir) });
  console.log(`Uploaded ${count} files in ${Math.round((Date.now() - started) / 1000)}s`);
  console.log('::endgroup::');
};

// CLI: `upload-assets.mjs <environment> [app|all]` — retains without deploying, for a backfill or a probe.
if (import.meta.url === `file://${process.argv[1]}`) {
  const [environment, only = 'all'] = process.argv.slice(2);
  if (!environment) {
    console.error('usage: upload-assets.mjs <environment> [app|all]');
    process.exit(1);
  }
  const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  for (const app of resolveApps(root, { environment, only })) {
    await retainAssets(root, app, environment);
  }
}
