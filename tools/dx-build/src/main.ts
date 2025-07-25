#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { readdir, stat, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import ts from 'typescript';

const VERBOSE = false;

const main = async () => {
  // Find and parse tsconfig.json.
  const tsconfigPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
  if (!tsconfigPath) {
    console.error('No tsconfig.json found in the current directory.');
    process.exit(1);
  }

  const configFileContent = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFileContent.error) {
    // TODO(wittjosiah): Pretty-print diagnostic.
    console.error(`Failed to read tsconfig.json: ${configFileContent.error.messageText}`);
    process.exit(1);
  }

  const parsedCommandLine = ts.parseJsonConfigFileContent(configFileContent.config, ts.sys, dirname(tsconfigPath));
  if (parsedCommandLine.errors.length > 0) {
    // TODO(wittjosiah): Pretty-print diagnostic.
    console.error(`Failed to parse tsconfig.json: ${parsedCommandLine.errors.map((d) => d.messageText).join('\n')}`);
    process.exit(1);
  }

  // Resolve outDir from tsconfig.
  const outDir = parsedCommandLine.options.outDir;
  console.log(`OutDir: ${outDir}`);
  if (!outDir) {
    console.error('No outDir found in tsconfig.json.');
    process.exit(1);
  }
  const outDirPath = resolve(process.cwd(), outDir);

  // List files in outDir.
  let files: string[] = [];
  try {
    files = await readdir(outDirPath);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      VERBOSE && console.log('Nothing to clean: outDir does not exist.');
    } else {
      console.error(`Failed to read outDir (${outDirPath}): ${err}`);
      process.exit(1);
    }
  }

  // Remove all files except tsconfig.tsbuildinfo.
  await Promise.all(
    files.map(async (file) => {
      // TODO(dmaretskyi): Keeping this file makes tsc skip emitting any files.
      // if (file === 'tsconfig.tsbuildinfo') {
      //   return;
      // }
      const filePath = join(outDirPath, file);
      try {
        const fileStat = await stat(filePath);
        if (fileStat.isDirectory()) {
          await rm(filePath, { recursive: true, force: true });
        } else {
          await rm(filePath, { force: true });
        }
        VERBOSE && console.log(`Removed: ${filePath}`);
      } catch (err) {
        console.error(`Failed to remove ${filePath}: ${err}`);
      }
    }),
  );
  VERBOSE && console.log('Clean complete.');

  // Run tsc after cleaning.
  VERBOSE && console.log('Running tsc...');
  const tsc = spawnSync('tsc', [], { stdio: 'inherit' });
  VERBOSE && console.log(`tsc exited with status ${tsc.status}`);
  process.exit(tsc.status ?? 1);
};

main().catch((err) => {
  console.error(`Unexpected error: ${err}`);
  process.exit(1);
});
