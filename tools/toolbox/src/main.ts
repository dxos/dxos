//
// Copyright 2024 DXOS.org
//

/**
 * Hook runs on `pnpm i` (see root `package.json` script `postinstall`).
 */

import { Toolbox } from './toolbox';

// TODO(burdon): Parse options using yargs.
const argModuleStats = process.argv.includes('--module-stats');
const argLintPackageExports = process.argv.includes('--lint-package-exports');

const toolbox = new Toolbox({ verbose: false });
await toolbox.init();

if (argModuleStats) {
  const stats = await toolbox.getModuleStats();

  for (const key in stats) {
    console.log(`\n\n# ${key}:\n`);
    for (const field in (stats as any)[key]) {
      console.log(`\n${field}:\n`);
      for (const pkg of (stats as any)[key][field]) {
        console.log(`- ${pkg}`);
      }
    }
  }
} else if (argLintPackageExports) {
  await toolbox.lintPackageExports();
  await toolbox.updatePackages();
} else {
  await toolbox.updateReleasePlease();
  await toolbox.updateRootPackage();
  // TODO(wittjosiah): Update for moon.
  // await toolbox.updateTags();
  // await toolbox.updateProjects();
  await toolbox.updatePackages();
  await toolbox.updateTsConfig();
  await toolbox.updateTsConfigPaths();
  await toolbox.updateTsConfigAll();
}

// await toolbox.printStats();
