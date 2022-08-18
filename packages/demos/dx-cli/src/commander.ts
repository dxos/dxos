//
// Copyright 2022 DXOS.org
//

import { Command } from 'commander';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { version } from '../package.json';

// TODO(burdon): Eval logging: https://www.npmjs.com/package/winston
//  https://npmcompare.com/compare/debug,log4js,morgan,winston

// TODO(burdon): Eval: https://npmcompare.com/compare/commander,oclif,yargs
//  - [x] TS, docs, maintenance, etc. (v. simple)
//  - [x] Global options
//  - [ ] Shell
//      CliUx (oclif)
//      await program.parseAsync(process.argv);
//      https://npmcompare.com/compare/inquirer,prompt
//  - [ ] Dynamic modules
//  - [ ] Completion:
//    https://www.npmjs.com/package/@oclif/plugin-autocomplete
//    https://yargs.js.org/docs/#api-reference-showcompletionscript

const program = new Command();

program
  .name('string-util')
  .description('CLI to some JavaScript string utilities')
  .option('--config', 'Set the config file (otherwise uses the DX_CONFIG env variable)')
  .option('--json', 'JSON output')
  .version(version);

program.command('split')
  .description('Split a string into substrings and display as an array')
  .argument('<string>', 'string to split')
  .option('--first', 'display just the first substring')
  .option('-s, --separator <char>', 'separator character', ',')
  .action((str, options, command) => {
    const { json, first, separator } = command.optsWithGlobals();
    const limit = first ? 1 : undefined;
    const parts = str.split(separator, limit);
    if (json) {
      console.log(JSON.stringify({ parts }));
    } else {
      console.log(parts);
    }
  });

program.parse();
