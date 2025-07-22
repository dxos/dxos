#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import { spawn } from 'node:child_process';
import { readFile, readdir, stat, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

type TsConfig = { compilerOptions?: { outDir?: string } };

const main = async () => {
  // Read tsconfig.json in the current directory.
  const tsconfigPath = resolve(process.cwd(), 'tsconfig.json');
  let tsconfig: TsConfig;
  try {
    const tsconfigRaw = await readFile(tsconfigPath, 'utf-8');
    tsconfig = JSON.parse(tsconfigRaw) as TsConfig;
  } catch (err) {
    console.error(`Failed to read tsconfig.json: ${err}`);
    process.exit(1);
  }

  // Resolve outDir from tsconfig.
  const outDir = tsconfig?.compilerOptions?.outDir;
  if (!outDir) {
    console.error('No outDir found in tsconfig.json.');
    process.exit(1);
  }
  const outDirPath = resolve(process.cwd(), outDir);
  console.log(`OutDir: ${outDirPath}`);

  // List files in outDir.
  let files: string[] = [];
  try {
    files = await readdir(outDirPath);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      console.log('Nothing to clean: outDir does not exist.');
    } else {
      console.error(`Failed to read outDir (${outDirPath}): ${err}`);
      process.exit(1);
    }
  }

  // Remove all files except tsconfig.tsbuildinfo.
  await Promise.all(
    files.map(async (file) => {
      if (file === 'tsconfig.tsbuildinfo') {
        return;
      }
      const filePath = join(outDirPath, file);
      try {
        const fileStat = await stat(filePath);
        if (fileStat.isDirectory()) {
          await rm(filePath, { recursive: true, force: true });
        } else {
          await rm(filePath, { force: true });
        }
        console.log(`Removed: ${filePath}`);
      } catch (err) {
        console.error(`Failed to remove ${filePath}: ${err}`);
      }
    }),
  );

  console.log('Clean complete.');

  console.log('Running tsc...');

  // Run tsc after cleaning.
  const tsc = spawn('tsc', [], { stdio: 'inherit' });
  tsc.on('exit', (code) => {
    if (code !== 0) {
      console.error('TypeScript compilation failed.');
      process.exit(code ?? 1);
    }
  });
  tsc.on('error', (err) => {
    console.error('Failed to run tsc:', err);
    process.exit(1);
  });
};

main().catch((err) => {
  console.error(`Unexpected error: ${err}`);
  process.exit(1);
});
