'use strict';

/**
 * When using the PNPM package manager, you can use pnpmfile.js to workaround
 * dependencies that have mistakes in their package.json file.  (This feature is
 * functionally similar to Yarn's "resolutions".)
 *
 * For details, see the PNPM documentation:
 * https://pnpm.js.org/docs/en/hooks.html
 *
 * IMPORTANT: SINCE THIS FILE CONTAINS EXECUTABLE CODE, MODIFYING IT IS LIKELY TO INVALIDATE
 * ANY CACHED DEPENDENCY ANALYSIS.  After any modification to pnpmfile.js, it's recommended to run
 * "rush update --full" so that PNPM will recalculate all version selections.
 */
module.exports = {
  hooks: {
    readPackage
  }
};

/**
 * This hook is invoked during installation before a package's dependencies
 * are selected.
 * The `packageJson` parameter is the deserialized package.json
 * contents for the package that is about to be installed.
 * The `context` parameter provides a log() function.
 * The return value is the updated object.
 */
function readPackage(packageJson, context) {
  if (packageJson.name === 'ts-essentials') {
    // This peer dependency is not required at runtime
    delete packageJson.peerDependencies['typescript']
  } else if (packageJson.name === '@hot-loader/react-dom') {
    // Package has an unneccessarily strict peer dep of 17.0.1
    packageJson.peerDependencies['react'] = '^17.0.0'
  } else if (packageJson.name === 'create-react-context' || packageJson.name === '@reach/router') {
    // Packages haven't been updated, see:
    // - https://github.com/jamiebuilds/create-react-context/pull/33
    // - https://github.com/reach/router/pull/43
    packageJson.peerDependencies['react'] = '>=15.0.0'
    packageJson.peerDependencies['react-dom'] = '>=15.0.0'
  }

  return packageJson;
}
