#!/usr/bin/env node

//
// Copyright 2020 DXOS.org
//

import { ArgumentParser } from 'argparse';
import { resolve } from 'path';
import readPkg from 'read-pkg';

import { logger } from './logger';
import { ModuleSpecifier } from './module-specifier';
import { parseAndGenerateSchema } from './type-generator';

void (async () => {
  const { version } = await readPkg();

  const parser = new ArgumentParser({
    description: 'Argparse example'
  });

  parser.add_argument('-v', '--version', { action: 'version', version } as any);
  parser.add_argument('proto', { help: 'protobuf input files', nargs: '+' });
  parser.add_argument('-s', '--substitutions', { help: 'substitutions file' });
  parser.add_argument('-o', '--outDir', { help: 'output directory path', required: true });

  const { proto, substitutions, outDir } = parser.parse_args();

  const substitutionsModule = substitutions ? ModuleSpecifier.resolveFromFilePath(substitutions, process.cwd()) : undefined;
  const protoFilePaths = proto.map((file: string) => resolve(process.cwd(), file));
  const outDirPath = resolve(process.cwd(), outDir);

  logger.logCompilationOptions(substitutionsModule, protoFilePaths, outDirPath);

  await parseAndGenerateSchema(substitutionsModule, protoFilePaths, outDirPath);
})();
