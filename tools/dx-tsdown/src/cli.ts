//
// Copyright 2026 DXOS.org
//

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import main, { type TsdownExecutorOptions } from './main.ts';

void (async () => {
  try {
    const argv: any = await yargs(hideBin(process.argv))
      .scriptName('dx-tsdown')
      .usage('$0 [options]')
      .option('entryPoint', { type: 'array', demandOption: true, describe: 'Entry points to build' })
      .option('platform', {
        type: 'array',
        default: ['browser', 'node'],
        describe: 'Target platforms: browser, node, neutral',
      })
      .option('injectGlobals', {
        type: 'boolean',
        default: false,
        describe: 'Inject @dxos/node-std/globals for browser builds',
      })
      .option('importGlobals', {
        type: 'boolean',
        default: false,
        describe: 'Import Buffer/process/global from @dxos/node-std',
      })
      .option('bundlePackage', { type: 'array', default: [], describe: 'npm packages to inline into the bundle' })
      .option('outputPath', { type: 'string', default: 'dist/lib', describe: 'JS output base directory' })
      .help().argv;

    const options: TsdownExecutorOptions = {
      entryPoints: argv.entryPoint as string[],
      platforms: argv.platform as Array<'browser' | 'node' | 'neutral'>,
      injectGlobals: argv.injectGlobals as boolean,
      importGlobals: argv.importGlobals as boolean,
      bundlePackages: argv.bundlePackage as string[],
      outputPath: argv.outputPath as string,
    };

    const result = await main(options);
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
