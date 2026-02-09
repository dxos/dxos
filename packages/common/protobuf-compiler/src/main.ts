#!/usr/bin/env node

//
// Copyright 2020 DXOS.org
//

import { resolve } from 'node:path';

import { ArgumentParser } from 'argparse';
import glob from 'glob';
import readPkg from 'read-pkg';

import { preconfigureProtobufjs } from './configure';
import { ModuleSpecifier } from './module-specifier';
import { registerResolver } from './parser';
import { parseAndGenerateSchema } from './type-generator';

const main = async () => {
  const { version } = await readPkg();

  const parser = new ArgumentParser({
    description: 'Protobuf compiler',
  });

  parser.add_argument('-v', '--version', { action: 'version', version } as any);
  parser.add_argument('--src', { help: 'Protobuf input files', nargs: '*' });
  parser.add_argument('-s', '--substitutions', { help: 'Substitutions file' });
  parser.add_argument('--baseDir', {
    help: 'Base path to resolve fully qualified packages',
  });
  parser.add_argument('-o', '--outDir', {
    help: 'Output directory path',
    required: true,
  });

  const { src, substitutions, baseDir, outDir } = parser.parse_args();

  // Handle both glob patterns and individual file paths
  let protoFilePaths: string[];
  if (Array.isArray(src) && src.length > 0) {
    // If src is an array, check if the first item is a glob pattern
    if (src.length === 1 && (src[0].includes('*') || src[0].includes('?'))) {
      // Single glob pattern
      protoFilePaths = glob.sync(src[0], { cwd: process.cwd() }).map((file: string) => resolve(process.cwd(), file));
    } else {
      // Multiple individual file paths
      protoFilePaths = src.map((file: string) => resolve(process.cwd(), file));
    }
  } else if (typeof src === 'string') {
    // Single glob pattern (legacy behavior)
    protoFilePaths = glob.sync(src, { cwd: process.cwd() }).map((file: string) => resolve(process.cwd(), file));
  } else {
    throw new Error('No source files specified');
  }

  const substitutionsModule = substitutions
    ? ModuleSpecifier.resolveFromFilePath(substitutions, process.cwd())
    : undefined;
  const baseDirPath = baseDir ? resolve(process.cwd(), baseDir) : undefined;
  const outDirPath = resolve(process.cwd(), outDir);

  // Initialize.
  registerResolver(baseDirPath);
  preconfigureProtobufjs();

  await parseAndGenerateSchema(
    substitutionsModule,
    protoFilePaths,
    baseDirPath,
    outDirPath,
    process.cwd(),
    // TODO(wittjosiah): Expose as args.
    undefined,
    true,
    false,
  );
};

void main();
