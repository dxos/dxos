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
  switch (packageJson.name) {
    case '@hot-loader/react-dom': {
      // Package has an unneccessarily strict peer dep of 17.0.1
      packageJson.peerDependencies['react'] = '^18.0.0'
      break;
    }

    // TODO(burdon): Can be removed once tutorials-tasks-app is removed or upgraded to MUI5.
    case '@mui/styles': {
      packageJson.peerDependencies['react'] = '^18.0.0'
      packageJson.peerDependencies['@types/react'] = '^18.0.0'
      break;
    }

    case 'react-resize-aware': {
      // https://github.com/FezVrasta/react-resize-aware/issues/59
      packageJson.peerDependencies['react'] = '^18.0.0'
      break;
    }

    case '@react/router':
    case 'create-react-context': {
      // Packages haven't been updated, see:
      // - https://github.com/reach/router/pull/43
      // - https://github.com/jamiebuilds/create-react-context/pull/33
      packageJson.peerDependencies['react'] = '>=15.0.0'
      packageJson.peerDependencies['react-dom'] = '>=15.0.0'
      break;
    }

    case 'ink':
    case 'ink-select-input':
    case 'ink-syntax-highlight':
    case 'ink-text-input':
    case 'react-reconciler': {
      packageJson.peerDependencies['react'] = '>=16.0.0'
      break;
    }

    case 'eslint-plugin-unused-imports': {
      packageJson.peerDependencies['@typescript-eslint/eslint-plugin'] = '^4.14.2 || ^5.0.0'
      break;
    }

    case 'ts-essentials': {
      // This peer dependency is not required at runtime.
      delete packageJson.peerDependencies['typescript']
      break;
    }

    // TODO(burdon): Remove.
    case 'wrtc': {
      delete packageJson.dependencies['node-pre-gyp'];
      packageJson.dependencies['@mapbox/node-pre-gyp'] = '1.0.3';
      break;
    }

    case 'bip39': {
      packageJson.dependencies['@types/node'] = '^16.11.27'
    }
  }

  return packageJson;
}
