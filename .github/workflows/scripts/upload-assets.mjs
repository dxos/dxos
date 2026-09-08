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
// Runs BEFORE the deploy (see deploy-env.mjs) so a failure stops the deploy rather than leaving a live
// version whose predecessors are unreachable.
//
// Uses R2's S3-compatible API. The two obvious alternatives are both dead ends at this scale: `wrangler r2
// object put` is one CLI process per file, and Cloudflare's REST API rate-limits at roughly 4 requests a
// second (measured: it 429s partway through a build), which would make a single deploy step take over half
// an hour. The S3 endpoint carries no such limit.
//
// Needs R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY (an R2 API token, distinct from CLOUDFLARE_API_TOKEN) plus
// CLOUDFLARE_ACCOUNT_ID.
//
// Usage: upload-assets.mjs <environment> [app|all]

import { execSync } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import { assetArchiveBucket, resolveApps } from './apps.mjs';

/** Parallel uploads. Bounded because an unbounded fan-out over 7,600 files exhausts local sockets long
 *  before it saturates the network. */
const CONCURRENCY = 32;

const REGION = 'auto';

/** Per-object attempts. A deploy is too expensive to fail on one transient 5xx. */
const ATTEMPTS = 3;

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

const contentType = (path) => CONTENT_TYPES[path.split('.').pop()?.toLowerCase()] ?? 'application/octet-stream';

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    }),
  );
  return files.flat();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

/**
 * Minimal SigV4 for one S3 PUT. Adapted from `.agents/skills/hosting-artifacts/scripts/upload-artifact.mjs`,
 * which signs the same way against a different bucket — kept local rather than shared because that script
 * is a standalone agent tool, not a deploy dependency.
 */
const sign = ({ host, bucket, key, payloadHash, contentType, accessKeyId, secretAccessKey }) => {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const allHeaders = {
    'content-type': contentType,
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  const signedHeaders = Object.keys(allHeaders)
    .map((name) => name.toLowerCase())
    .sort();
  const canonicalHeaders = signedHeaders.map((name) => `${name}:${String(allHeaders[name]).trim()}\n`).join('');
  // Each path segment is encoded individually; the slashes between them must stay literal.
  const canonicalUri = `/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders.join(';'), payloadHash].join('\n');

  const scope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), REGION), 's3'), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      ...allHeaders,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
        `SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`,
    },
  };
};

const upload = async ({ credentials, bucket, key, body, type }) => {
  const signed = sign({
    host: credentials.host,
    bucket,
    key,
    payloadHash: sha256(body),
    contentType: type,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
  });

  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(signed.url, { method: 'PUT', headers: signed.headers, body });
      if (response.ok) {
        return;
      }
      lastError = new Error(`${response.status} ${response.statusText}: ${(await response.text()).slice(0, 200)}`);
      // A signature or permission problem will not improve on a retry.
      if (response.status < 500 && response.status !== 429) {
        break;
      }
    } catch (error) {
      lastError = error;
    }
    if (attempt < ATTEMPTS) {
      await sleep(2 ** attempt * 250);
    }
  }
  throw new Error(`failed to upload ${key}: ${lastError?.message ?? 'unknown error'}`);
};

/**
 * Upload every file under `<outDir>/assets` to `bucket`, keyed by its path relative to `outDir` — the
 * same shape the Worker looks up (`/assets/foo-hash.js` → `assets/foo-hash.js`).
 *
 * Unconditional: every file, every deploy, even one already present. R2 lifecycle rules expire by object
 * age, so a conditional upload would drop a chunk that has been in the build longer than the retention
 * window WHILE IT IS STILL LIVE, breaking the current build rather than an old one. Re-uploading refreshes
 * the age of everything still shipping, so a chunk expires exactly one window after the last build that
 * contained it.
 */
const uploadAssets = async ({ credentials, bucket, outDir }) => {
  const assetsDir = join(outDir, 'assets');
  const files = await walk(assetsDir);
  let done = 0;
  let failed;

  const worker = async () => {
    for (;;) {
      const path = files[done++];
      if (path === undefined || failed) {
        return;
      }
      const key = relative(outDir, path).split(sep).join('/');
      try {
        await upload({ credentials, bucket, key, body: await readFile(path), type: contentType(path) });
      } catch (error) {
        failed ??= error;
        return;
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (failed) {
    throw failed;
  }
  return files.length;
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

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required');
  }
  const credentials = { host: `${accountId}.r2.cloudflarestorage.com`, accessKeyId, secretAccessKey };

  console.log(`::group::Retain ${app.name} assets -> ${bucket}`);
  const started = Date.now();
  const count = await uploadAssets({ credentials, bucket, outDir: join(root, app.outDir) });
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
