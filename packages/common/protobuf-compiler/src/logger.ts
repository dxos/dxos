//
// Copyright 2020 DXOS.org
//

/* eslint-disable no-console */

import chalk from 'chalk';

import { type ModuleSpecifier } from './module-specifier';
import { type SubstitutionsMap } from './parser';

type LoggerOptions = {
  verbose?: boolean;
};

export class Logger {
  constructor(private readonly _options: LoggerOptions = {}) {}

  logCompilationOptions(protoFilePaths: string[], baseDirPath: string | undefined, outDirPath: string): void {
    if (this._options?.verbose) {
      console.log(chalk`Output: {bold ${outDirPath}}`);
      console.log(chalk`Sources:`);
      for (const file of protoFilePaths) {
        console.log(chalk`{green ${file}}`);
      }
      console.log();
    }
  }

  logParsedSubstitutions(substitutionsModule: ModuleSpecifier, substitutions: SubstitutionsMap): void {
    if (this._options?.verbose) {
      console.log(chalk`Definitions: {bold ${substitutionsModule.resolve()}}`);
      if (Object.keys(substitutions).length > 0) {
        for (const [protoType, tsType] of Object.entries(substitutions)) {
          console.log(chalk`- {green ${protoType}} -> {bold ${tsType}}`);
        }
        console.log();
      }
    }
  }
}
