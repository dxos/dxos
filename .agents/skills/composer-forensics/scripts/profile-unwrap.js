#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { unwrapProfileArchive } from './src/profile-archive-sqlite.js';

const usage = `Usage: profile-unwrap.js <input.dxprofile> [--out-dir <dir>]

Extract SQLITE_DATABASE entries from a .dxprofile archive to raw .sqlite files.

Output files are named <opfs-filename>.sqlite (e.g. DXOS.sqlite).

Examples:
  node profile-unwrap.js ./composer-2026-06-07.dxprofile
  node profile-unwrap.js ./backup.dxprofile --out-dir /tmp/composer-forensics/unwrapped

Requires Node.js 24+. Run from scripts/ after pnpm install.
`;

const parseArgs = (argv) => {
  /** @type {string | undefined} */
  let inputPath;
  let outDir = '.';

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      console.log(usage);
      process.exit(0);
    }
    if (arg === '--out-dir') {
      outDir = argv[++index] ?? '';
      if (!outDir) {
        throw new Error('--out-dir requires a value');
      }
      continue;
    }
    if (!inputPath) {
      inputPath = arg;
      continue;
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  return { inputPath, outDir };
};

const main = () => {
  try {
    const { inputPath, outDir } = parseArgs(process.argv.slice(2));

    if (!inputPath) {
      console.log(usage);
      process.exit(1);
    }

    const archiveBytes = new Uint8Array(readFileSync(inputPath));
    const entries = unwrapProfileArchive(archiveBytes);

    if (entries.length === 0) {
      throw new Error('No valid SQLITE_DATABASE entries found in profile archive');
    }

    mkdirSync(outDir, { recursive: true });

    for (const entry of entries) {
      const outputPath = join(outDir, `${entry.opfsFilename}.sqlite`);
      writeFileSync(outputPath, entry.database);
      console.log(
        `Wrote ${outputPath} (${entry.database.byteLength.toLocaleString()} bytes, opfs=${entry.opfsFilename})`,
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

main();
