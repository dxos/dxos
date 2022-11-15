//
// Copyright 2020 DXOS.org
//

import chalk from 'chalk';

import { ModuleSpecifier } from './module-specifier';
import { SubstitutionsMap } from './parser';

export class Logger {
  logCompilationOptions(
    protoFilePaths: string[],
    baseDirPath: string | undefined,
    outDirPath: string,
    verbose = false
  ) {
    if (verbose) {
      console.log(chalk`Output: {bold ${outDirPath}}`);
      console.log(chalk`Sources:`);
      for (const file of protoFilePaths) {
        console.log(chalk`{green ${file}}`);
      }
      console.log();
    }
  }

  logParsedSubstitutions(substitutionsModule: ModuleSpecifier, substitutions: SubstitutionsMap, verbose = false) {
    console.log('Processing substitutions...');
    if (verbose) {
      console.log(chalk`Definitions: {bold ${substitutionsModule.resolve()}}`);
      if (Object.keys(substitutions).length > 0) {
        for (const [protoType, tsType] of Object.entries(substitutions)) {
          console.log(chalk`- {green ${protoType}} -> {bold ${tsType}}`);
        }
        console.log();
      }
    }
  }

  logExports(outDir: string, verbose = false) {
    console.info('Generating exports...');
    if (verbose) {
      console.log(chalk`Output: {bold ${outDir}}`);
    }
  }
}

export const logger = new Logger();
