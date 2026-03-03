#!/usr/bin/env node

import { chalk, fs } from 'zx';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import { sleep } from '@dxos/async';
import { writeFileSync } from 'fs';
import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

//
// Upload all assets from dist/vendor to cloudflare bucket.
//
// USAGE:
// R2_ACCESS_KEY_ID=<key> R2_SECRET_ACCESS_KEY=<secret> ./upload-modules.mjs --env <env>
//
// This script uploads vendored packages to Cloudflare R2 bucket using S3 API calls.
// Files are uploaded to <bucket>/<env>/ prefix with 10 concurrent threads.
// Optimized for many small files (1KB average, max 3MB).
//

const CLOUDFLARE_ACCOUNT_ID = '950816f3f59b079880a1ae33fb0ec320';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error(chalk.red('Error: R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY environment variables must be set'));
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



const createS3Client = () =>
  new S3Client({
    region: 'auto',
    endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

const isRetryableS3Error = (err) => {
  const statusCode = err?.$metadata?.httpStatusCode;
  const name = err?.name;
  const code = err?.Code;
  return (
    statusCode === 429 ||
    statusCode === 408 ||
    statusCode === 409 ||
    (typeof statusCode === 'number' && statusCode >= 500 && statusCode < 600) ||
    name === 'SlowDown' ||
    name === 'Throttling' ||
    code === 'SlowDown' ||
    code === 'Throttling'
  );
};

async function sendWithRetries(s3, command) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await s3.send(command);
    } catch (err) {
      lastError = err;

      const statusCode = err?.$metadata?.httpStatusCode;
      if ((statusCode === 429 || err?.name === 'SlowDown' || err?.Code === 'SlowDown') && !rateLimitedPrinted) {
        console.log(chalk.yellow('Rate limited'));
        rateLimitedPrinted = true;
      }

      if (attempt < MAX_RETRIES && isRetryableS3Error(err)) {
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

async function uploadObject(s3, r2Key, body, contentType) {
  await sendWithRetries(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: r2Key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

async function listObjects(s3, prefix) {
  const keys = [];
  let continuationToken;

  while (true) {
    const result = await sendWithRetries(
      s3,
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      }),
    );

    for (const obj of result.Contents ?? []) {
      if (typeof obj?.Key === 'string') {
        keys.push(obj.Key);
      }
    }

    if (!result.IsTruncated || !result.NextContinuationToken) {
      break;
    }

    continuationToken = result.NextContinuationToken;
  }

  return keys;
}

const chunk = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

async function deleteObjectsBulk(s3, keys) {
  if (keys.length === 0) {
    return;
  }

  const batches = chunk(keys, 1000);
  const totalBatches = batches.length;
  let completedBatches = 0;

  const runBatch = async (batchKeys) => {
    const result = await sendWithRetries(
      s3,
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: batchKeys.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );

    if (Array.isArray(result.Errors) && result.Errors.length > 0) {
      throw new Error(`DeleteObjects failed: ${JSON.stringify(result.Errors.slice(0, 10))}`);
    }
  };

  let index = 0;
  async function runNext() {
    if (index >= batches.length) return;
    const batch = batches[index++];
    await runBatch(batch);
    completedBatches++;

    if (completedBatches % 10 === 0 || completedBatches === totalBatches) {
      console.log(
        chalk.cyan(
          `Progress: ${completedBatches}/${totalBatches} batches (${((completedBatches / totalBatches) * 100).toFixed(1)}%)`,
        ),
      );
    }

    await runNext();
  }

  await Promise.all(
    Array(Math.min(CONCURRENCY, batches.length))
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
const s3Client = createS3Client();

/**
 * Upload a single file to R2 using Cloudflare API.
 */
async function uploadFile(filePath, vendorDir, env) {
  const r2Key = getR2Key(filePath, vendorDir, env);

  // Read file content.
  const fileContent = await fs.readFile(filePath);

  // Determine content type based on file extension.
  const contentType = getContentType(filePath);
  await uploadObject(s3Client, r2Key, fileContent, contentType);
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
  await uploadObject(s3Client, manifestKey, Buffer.from(JSON.stringify(manifest, null, 2)), 'application/json');
  writeFileSync('dist/vendor/manifest.json', JSON.stringify(manifest, null, 2));

  console.log(chalk.blue(`\nListing objects in prefix: ${env}/`));
  const remoteKeys = (await listObjects(s3Client, `${env}/`)).sort((a, b) => a.localeCompare(b));
  console.log(chalk.green(`Found ${remoteKeys.length} objects in prefix: ${env}/\n`));

  const manifestKeys = new Set([...manifestEntries.map((e) => e.key)]);
  const keysToDelete = remoteKeys.filter((key) => !manifestKeys.has(key));
  if (keysToDelete.length > 0) {
    console.log(chalk.yellow(`\nDeleting ${keysToDelete.length} objects not in manifest...`));
    await deleteObjectsBulk(s3Client, keysToDelete);
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
