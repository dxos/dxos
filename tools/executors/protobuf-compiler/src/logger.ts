//
// Copyright 2020 DXOS.org
//

import chalk from 'chalk';

import { ModuleSpecifier } from './module-specifier';
import { SubstitutionsMap } from './parser';

export class Logger {
  logCompilationOptions (
    substitutionsModule: ModuleSpecifier | undefined,
    protoFilePaths: string[],
    baseDirPath: string | undefined,
    outDirPath: string
  ) {
    console.log('Compiling protobuf definitions');
    console.log('');
    console.log(chalk`       Proto file(s): {bold ${protoFilePaths[0]}}`);
    for (const file of protoFilePaths.slice(1)) {
      console.log(chalk`                      {bold ${file}}`);
    }
    substitutionsModule && console.log(chalk`Substitution file: {bold ${substitutionsModule.resolve()}}`);
    console.log(chalk` Output directory: {bold ${outDirPath}}`);
    console.log();
  }

  logParsedSubstitutions (substitutions: SubstitutionsMap) {
    if (Object.keys(substitutions).length > 0) {
      console.log(chalk`Loaded {bold ${Object.keys(substitutions).length}} substitutions:`);
      console.log();
      for (const [protoType, tsType] of Object.entries(substitutions)) {
        console.log(chalk`  {bold ${protoType}} -> {bold ${tsType}}`);
      }
      console.log();
    } else {
      console.log('No substitutions loaded');
      console.log();
    }
  }
}

export const logger = new Logger();
