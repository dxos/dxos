#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

import { OPFS_SQLITE_DB_FILENAME, wrapSqliteToProfileArchive } from './src/profile-archive-sqlite.js';

const usage = `Usage: profile-wrap.js [--name DXOS] [--origin host] <input.sqlite> [output.dxprofile]

Wrap a raw SQLite file into a CBOR .dxprofile archive with a SQLITE_DATABASE entry.

Examples:
  node profile-wrap.js /tmp/composer-forensics/main.composer.space/DXOS.sqlite
  node profile-wrap.js --name DXOS --origin main.composer.space ./DXOS.sqlite ./backup.dxprofile

Requires Node.js 24+. Run from scripts/ after pnpm install.
`;

const parseArgs = (argv) => {
  let opfsFilename = OPFS_SQLITE_DB_FILENAME;
  /** @type {string | undefined} */
  let origin;
  /** @type {string[]} */
  const positional = [];

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      console.log(usage);
      process.exit(0);
    }
    if (arg === '--name') {
      opfsFilename = argv[++index] ?? '';
      if (!opfsFilename) {
        throw new Error('--name requires a value');
      }
      continue;
    }
    if (arg === '--origin') {
      origin = argv[++index] ?? '';
      if (!origin) {
        throw new Error('--origin requires a value');
      }
      continue;
    }
    positional.push(arg);
  }

  return { opfsFilename, origin, positional };
};

const main = () => {
  try {
    const { opfsFilename, origin, positional } = parseArgs(process.argv.slice(2));
    const [inputPath, outputPathArg] = positional;

    if (!inputPath) {
      console.log(usage);
      process.exit(1);
    }

    const database = new Uint8Array(readFileSync(inputPath));
    const archiveBytes = wrapSqliteToProfileArchive(opfsFilename, database, origin ? { origin } : undefined);
    const outputPath =
      outputPathArg ?? join(dirname(inputPath), `${basename(inputPath, extname(inputPath))}.dxprofile`);

    writeFileSync(outputPath, archiveBytes);
    console.log(
      `Wrote ${outputPath} (${archiveBytes.byteLength.toLocaleString()} bytes, opfs=${opfsFilename}, sqlite=${database.byteLength.toLocaleString()} bytes)`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

main();
