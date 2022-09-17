#!/usr/bin/env node

//
// Copyright 2020 DXOS.org
//

import { ArgumentParser } from 'argparse';
import { resolve } from 'path';
import readPkg from 'read-pkg';

import { preconfigureProtobufjs } from './configure';
import { logger } from './logger';
import { ModuleSpecifier } from './module-specifier';
import { registerResolver } from './parser';
import { parseAndGenerateSchema } from './type-generator';

const main = async () => {
  const { version } = await readPkg();

  const parser = new ArgumentParser({
    description: 'Protobuf compiler'
  });

  parser.add_argument('-v', '--version', { action: 'version', version } as any);
  parser.add_argument('proto', { help: 'Protobuf input files', nargs: '+' }); // TODO(burdon): Glob.
  parser.add_argument('-s', '--substitutions', { help: 'Substitutions file' });
  parser.add_argument('--baseDir', { help: 'Base path to resolve fully qualified packages' });
  parser.add_argument('-o', '--outDir', { help: 'Output directory path', required: true });

  const { proto, substitutions, baseDir, outDir } = parser.parse_args();

  const protoFilePaths = proto.map((file: string) => resolve(process.cwd(), file));
  const substitutionsModule = substitutions ? ModuleSpecifier.resolveFromFilePath(substitutions, process.cwd()) : undefined;
  const baseDirPath = baseDir ? resolve(process.cwd(), baseDir) : undefined;
  const outDirPath = resolve(process.cwd(), outDir);

  // Initialize.
  registerResolver(baseDirPath);
  preconfigureProtobufjs();

  logger.logCompilationOptions(substitutionsModule, protoFilePaths, baseDirPath, outDirPath);
  await parseAndGenerateSchema(substitutionsModule, protoFilePaths, baseDirPath, outDirPath);
};

void main();
