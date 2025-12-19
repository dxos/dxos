#!/usr/bin/env node

import { chalk, fs } from 'zx';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import { sleep } from '@dxos/async';
import { writeFileSync } from 'fs';
import { log } from '@dxos/log';

//
// Upload all assets from dist/vendor to cloudflare bucket.
//
// USAGE:
// ./upload-modules.mjs --env <env>
//
// This script uploads vendored packages to Cloudflare R2 bucket using direct API calls.
// Files are uploaded to <bucket>/<env>/ prefix with 10 concurrent threads.
// Optimized for many small files (1KB average, max 3MB).
//

const CLOUDFLARE_ACCOUNT_ID = '950816f3f59b079880a1ae33fb0ec320';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!CLOUDFLARE_API_TOKEN) {
  console.error(chalk.red('Error: CLOUDFLARE_API_TOKEN environment variable is not set'));
  process.exit(1);
}
const BUCKET = 'script-vendored-packages';
const VALID_ENVS = ['dev', 'main', 'production'];
const CONCURRENCY = 20;
const MAX_RETRIES = 6;
const BASE_RETRY_DELAY_MS = 200;
const MAX_RETRY_DELAY_MS = 10_000;


const getRetryDelayMs = (attempt) => {
  const backoffMs = Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * 2 ** Math.max(0, attempt - 1));
  const jitter = 0.5 + Math.random();
  return Math.round(backoffMs * jitter);
};


const getObjectUrl = (r2Key) =>
  `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${(r2Key)}`;

async function fetchWithRetries(url, init) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        return response;
      }

      const errorText = await response.text();
      const isRateLimited = response.status === 429 || errorText.includes('Rate limited') || errorText.includes('Please wait');
      const isRetryableStatus =
        isRateLimited || response.status === 408 || response.status === 409 || (response.status >= 500 && response.status < 600);

      if (isRateLimited && !rateLimitedPrinted) {
        console.log(chalk.yellow('Rate limited'));
        rateLimitedPrinted = true;
      }

      if (attempt < MAX_RETRIES && isRetryableStatus) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : Number.NaN;
        const delayMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : getRetryDelayMs(attempt);
        await sleep(delayMs);
        continue;
      }

      throw new Error(`Request failed (${response.status}): ${errorText}`);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(getRetryDelayMs(attempt));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.ts': 'application/typescript',
      '.mts': 'application/typescript',
      '.json': 'application/json',
      '.wasm': 'application/wasm',
      '.map': 'application/json',
    }[ext] || 'application/octet-stream'
  );
};

const getR2Key = (filePath, vendorDir, env) => {
  const relativePath = path.relative(vendorDir, filePath);
  return `${env}/${relativePath}`;
};

async function uploadObject(r2Key, body, contentType) {
  const url = getObjectUrl(r2Key);
  await fetchWithRetries(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': contentType,
    },
    body,
  });
}

async function listObjects(prefix) {
  const keys = [];
  let cursor;
  while (true) {
    const url = new URL(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${BUCKET}/objects`,
    );
    url.searchParams.set('prefix', prefix);
    url.searchParams.set('limit', '1000');
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    const response = await fetchWithRetries(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
    });

    const data = await response.json();
    if (data && data.success === false) {
      throw new Error(`List failed: ${JSON.stringify(data.errors ?? data)}`);
    }

    const result = data?.result ?? data;
    const objects = result?.objects ?? result;
    if (!Array.isArray(objects)) {
      throw new Error(`Unexpected list response: ${JSON.stringify(data)}`);
    }

    for (const obj of objects) {
      const key = obj?.key ?? obj?.name;
      if (typeof key === 'string') {
        keys.push(key);
      }
    }

    const truncated = Boolean(data?.result_info?.is_truncated);
    cursor = data?.result_info?.cursor;
    if (!truncated || !cursor) {
      break;
    }
  }

  return keys;
}

async function deleteObject(r2Key) {
  const url = getObjectUrl(r2Key);
  await fetchWithRetries(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
    },
  });
}

async function deleteWithConcurrency(keys, concurrency) {
  let index = 0;
  let completed = 0;

  async function runNext() {
    if (index >= keys.length) return;
    const r2Key = keys[index++];
    await deleteObject(r2Key);
    completed++;
    await runNext();

    // Show progress every 50 files.
    if (completed % 50 === 0 || completed === keys.length) {
      console.log(chalk.cyan(`Deleted: ${completed}/${keys.length} (${((completed / keys.length) * 100).toFixed(1)}%)`));
    }
  }

  await Promise.all(
    Array(Math.min(concurrency, keys.length))
      .fill(null)
      .map(() => runNext()),
  );
}

/**
 * Parse command line arguments.
 */
const argv = yargs(hideBin(process.argv))
  .option('env', {
    alias: 'e',
    type: 'string',
    description: 'Environment (dev, main, production)',
    demandOption: true,
  })
  .option('dry-run', {
    type: 'boolean',
    description: 'Perform a dry run without uploading',
    default: false,
  })
  .check((argv) => {
    if (!VALID_ENVS.includes(argv.env)) {
      throw new Error(`Invalid environment: ${argv.env}. Must be one of: ${VALID_ENVS.join(', ')}`);
    }
    return true;
  })
  .help().argv;

/**
 * Get all files from dist/vendor directory recursively.
 */
async function getFilesToUpload(vendorDir) {
  const files = [];

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  await walk(vendorDir);
  return files;
}

let rateLimitedPrinted = false;

/**
 * Upload a single file to R2 using Cloudflare API.
 */
async function uploadFile(filePath, vendorDir, env) {
  const r2Key = getR2Key(filePath, vendorDir, env);

  // Read file content.
  const fileContent = await fs.readFile(filePath);

  // Determine content type based on file extension.
  const contentType = getContentType(filePath);
  await uploadObject(r2Key, fileContent, contentType);
}

/**
 * Upload files with concurrency limit and progress tracking.
 */
async function uploadWithConcurrency(files, vendorDir, env, concurrency) {
  let index = 0;
  let completed = 0;
  const total = files.length;

  async function runNext() {
    if (index >= files.length) return;

    const currentIndex = index++;
    const file = files[currentIndex];

    await uploadFile(file, vendorDir, env);
    completed++;

    // Show progress every 50 files.
    if (completed % 50 === 0 || completed === total) {
      console.log(chalk.cyan(`Progress: ${completed}/${total} (${((completed / total) * 100).toFixed(1)}%)`));
    }

    await runNext();
  }

  // Start initial batch.
  await Promise.all(
    Array(Math.min(concurrency, files.length))
      .fill(null)
      .map(() => runNext()),
  );
}

/**
 * Main execution.
 */
async function main() {
  const env = argv.env;
  const dryRun = argv['dry-run'];

  console.log(chalk.bold.cyan(`\n🚀 Uploading vendored packages to R2`));
  console.log(chalk.cyan(`   Bucket: ${BUCKET}`));
  console.log(chalk.cyan(`   Environment: ${env}`));
  console.log(chalk.cyan(`   Concurrency: ${CONCURRENCY}`));
  console.log(chalk.cyan(`   Dry run: ${dryRun ? 'yes' : 'no'}\n`));
  const vendorDir = 'dist/vendor';

  // Check if vendor directory exists.
  if (!(await fs.pathExists(vendorDir))) {
    console.error(chalk.red(`Error: Vendor directory not found: ${vendorDir}`));
    console.error(chalk.yellow('Run the build process first to generate vendored packages.'));
    process.exit(1);
  }

  // Get all files to upload.
  console.log(chalk.blue('Scanning files...'));
  const files = await getFilesToUpload(vendorDir);
  console.log(chalk.green(`Found ${files.length} files to upload\n`));

  const manifestKey = `${env}/manifest.json`;

  if (files.length === 0) {
    console.log(chalk.yellow('No files to upload.'));
    return;
  }

  if (dryRun) {
    console.log(chalk.yellow('Dry run - files that would be uploaded:'));
    for (const file of files) {
      console.log(chalk.gray(`  ${getR2Key(file, vendorDir, env)}`));
    }
    console.log(chalk.gray(`  ${manifestKey}`));
    return;
  }

  const manifestEntries = (
    await Promise.all(
      files.map(async (filePath) => {
        const r2Key = getR2Key(filePath, vendorDir, env);
        const stat = await fs.stat(filePath);
        return {
          key: r2Key,
          size: stat.size,
          contentType: getContentType(filePath),
        };
      }),
    )
  ).sort((a, b) => a.key.localeCompare(b.key));
  manifestEntries.push({
    key: manifestKey,
    size: 0,
    contentType: 'application/json',
  });

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    bucket: BUCKET,
    env,
    prefix: `${env}/`,
    count: manifestEntries.length,
    files: manifestEntries,
  };

  // Upload files with concurrency.
  console.log(chalk.blue(`\nUploading files with ${CONCURRENCY} concurrent threads...\n`));
  const startTime = Date.now();

  await uploadWithConcurrency(files, vendorDir, env, CONCURRENCY);

  console.log(chalk.blue(`\nUploading manifest: ${manifestKey}`));
  await uploadObject(manifestKey, Buffer.from(JSON.stringify(manifest, null, 2)), 'application/json');
  writeFileSync('dist/vendor/manifest.json', JSON.stringify(manifest, null, 2));

  console.log(chalk.blue(`\nListing objects in prefix: ${env}/`));
  const remoteKeys = (await listObjects(`${env}/`)).sort((a, b) => a.localeCompare(b));
  console.log(chalk.green(`Found ${remoteKeys.length} objects in prefix: ${env}/\n`));

  const manifestKeys = new Set([...manifestEntries.map((e) => e.key)]);
  const keysToDelete = remoteKeys.filter((key) => !manifestKeys.has(key));
  if (keysToDelete.length > 0) {
    console.log(chalk.yellow(`\nDeleting ${keysToDelete.length} objects not in manifest...`));
    await deleteWithConcurrency(keysToDelete, CONCURRENCY);
  } else {
    console.log(chalk.green('\nNo extra objects to delete.'));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(chalk.bold.green(`\n✨ All ${files.length} files uploaded successfully in ${duration}s!\n`));
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error);
  process.exit(1);
});
