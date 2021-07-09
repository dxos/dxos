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

  if (packageJson.name === 'wrtc') {
    // The package got renamed
    delete packageJson.dependencies['node-pre-gyp']
    packageJson.dependencies['@mapbox/node-pre-gyp'] = '1.0.3'
  } else if(packageJson.name === 'ts-essentials') {
    // This peer dependency is not required at runtime
    delete packageJson.peerDependencies['typescript']
  } else if (packageJson.name === 'hypercore-protocol') {
    // We have a fix for Buffer issues.
    packageJson.dependencies['simple-hypercore-protocol'] = 'dxos/simple-hypercore-protocol#bc23f0747e55954ec0bd94754910c92f88ec561c'
  }

  return packageJson;
}
