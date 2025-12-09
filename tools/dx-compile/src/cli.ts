#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import main, { type EsbuildExecutorOptions } from './main';

void (async () => {
  try {
    const argv: any = yargs(hideBin(process.argv))
      .scriptName('dx-compile')
      .usage('$0 [options]')
      .option('bundle', { type: 'boolean', default: true, describe: 'Bundle the build output' })
      .option('bundlePackage', { type: 'array', default: [], describe: 'Packages to include in the bundle' })
      .option('ignorePackage', { type: 'array', default: [], describe: 'Packages to ignore when bundling' })
      .option('entryPoint', { type: 'array', demandOption: true, describe: 'Entrypoints for esbuild to build from' })
      .option('importGlobals', { type: 'boolean', default: false, describe: 'Import globals into module scope' })
      .option('metafile', { type: 'boolean', default: true, describe: 'Output a build meta file' })
      .option('outputPath', { type: 'string', demandOption: true, describe: 'Directory to output build files' })
      .option('platform', { type: 'array', default: ['browser', 'node'], describe: 'Platforms to create bundles for' })
      .option('moduleFormat', { type: 'array', default: ['esm'], describe: 'Module formats to emit' })
      .option('sourcemap', { type: 'boolean', default: true, describe: 'Output sourcemaps' })
      .option('watch', { type: 'boolean', default: false, describe: 'Watch mode' })
      .option('alias', { type: 'string', default: '{}', describe: 'Alias imports (JSON string)' })
      .option('preactSignalTracking', { type: 'boolean', default: false, describe: 'Enable preact signal tracking' })
      .help().argv;

    // Parse alias JSON string if provided.
    let alias: Record<string, string> = {};
    try {
      alias = typeof argv.alias === 'string' ? JSON.parse(argv.alias) : argv.alias;
    } catch (err) {
      console.error('Failed to parse alias JSON:', err);
      process.exit(1);
    }
    const options: EsbuildExecutorOptions = {
      bundle: argv.bundle as boolean,
      bundlePackages: argv.bundlePackage as string[],
      ignorePackages: argv.ignorePackage as string[],
      entryPoints: argv.entryPoint as string[],
      importGlobals: argv.importGlobals as boolean,
      metafile: argv.metafile as boolean,
      outputPath: argv.outputPath as string,
      platforms: argv.platform as any[],
      moduleFormat: argv.moduleFormat as any[],
      sourcemap: argv.sourcemap as boolean,
      watch: argv.watch as boolean,
      alias,
      preactSignalTracking: argv.preactSignalTracking as boolean,
      verbose: argv.verbose as boolean,
    };
    const result = await main(options);
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
