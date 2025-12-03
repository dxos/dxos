#!/usr/bin/env node

import { chalk, fs } from 'zx';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import { fileURLToPath } from 'url';

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLOUDFLARE_ACCOUNT_ID = '950816f3f59b079880a1ae33fb0ec320';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!CLOUDFLARE_API_TOKEN) {
  console.error(chalk.red('Error: CLOUDFLARE_API_TOKEN environment variable is not set'));
  process.exit(1);
}
const BUCKET = 'script-vendored-packages';
const VALID_ENVS = ['dev', 'main', 'production'];
const CONCURRENCY = 20;

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
  const relativePath = path.relative(vendorDir, filePath);
  const r2Key = `${env}/${relativePath}`;

  // Read file content.
  const fileContent = await fs.readFile(filePath);

  // Determine content type based on file extension.
  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    {
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.ts': 'application/typescript',
      '.mts': 'application/typescript',
      '.json': 'application/json',
      '.wasm': 'application/wasm',
      '.map': 'application/json',
    }[ext] || 'application/octet-stream';

  // Upload to R2 using Cloudflare API.
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${r2Key}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': contentType,
    },
    body: fileContent,
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (errorText.includes('Rate limited') || errorText.includes('Please wait')) {
      if (!rateLimitedPrinted) {
        console.log(chalk.yellow(`Rate limited`));
        rateLimitedPrinted = true;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await uploadFile(filePath, vendorDir, env);
    }
    throw new Error(`Upload failed for ${relativePath} (${response.status}): ${errorText}`);
  }
}

/**
 * Upload files with concurrency limit and progress tracking.
 */
async function uploadWithConcurrency(files, vendorDir, env, concurrency) {
  let activeCount = 0;
  let index = 0;
  let completed = 0;
  const total = files.length;

  async function runNext() {
    if (index >= files.length) return;

    const currentIndex = index++;
    const file = files[currentIndex];

    activeCount++;
    try {
      await uploadFile(file, vendorDir, env);
      completed++;

      // Show progress every 50 files.
      if (completed % 50 === 0 || completed === total) {
        console.log(chalk.cyan(`Progress: ${completed}/${total} (${((completed / total) * 100).toFixed(1)}%)`));
      }
    } finally {
      activeCount--;
    }

    // Process next file.
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

  if (files.length === 0) {
    console.log(chalk.yellow('No files to upload.'));
    return;
  }

  if (dryRun) {
    console.log(chalk.yellow('Dry run - files that would be uploaded:'));
    for (const file of files) {
      const relativePath = path.relative(vendorDir, file);
      console.log(chalk.gray(`  ${env}/${relativePath}`));
    }
    return;
  }

  // Upload files with concurrency.
  console.log(chalk.blue(`\nUploading files with ${CONCURRENCY} concurrent threads...\n`));
  const startTime = Date.now();

  await uploadWithConcurrency(files, vendorDir, env, CONCURRENCY);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(chalk.bold.green(`\n✨ All ${files.length} files uploaded successfully in ${duration}s!\n`));
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error);
  process.exit(1);
});
