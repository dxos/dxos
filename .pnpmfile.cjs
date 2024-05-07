// https://pnpm.io/pnpmfile

const cp = require('child_process');
const fs = require('fs');

/**
 * https://pnpm.io/pnpmfile
 */
function readPackage(pkg, context) {
  switch (pkg.name) {
    // Align on single version of buffer polyfill.
    case '@sammacbeth/random-access-idb-mutable-file':
    case 'abstract-leveldown':
    case 'bl':
    case 'crc':
    case 'level-codec':
    case 'level-js':
    case 'random-access-idb-mutable-file':
    case 'unbzip2-stream': {
      pkg.dependencies['buffer'] = '^6.0.3';
      break;
    }

    // Package has an unneccessarily strict peer dep of 17.0.1
    case '@hot-loader/react-dom': {
      pkg.peerDependencies['react'] = '^18.0.0';
      break;
    }

    // https://github.com/nrwl/nx/issues/11456#issuecomment-1211214171
    case '@nx/nx-cloud': {
      pkg.dependencies['dotenv'] = '*';
      break;
    }

    case '@nx/eslint-plugin':
    case '@nrwl/eslint-plugin-nx': {
      pkg.peerDependencies['@typescript-eslint/parser'] = '^6.5.0';
      break;
    }

    case 'eslint-config-semistandard': {
      pkg.peerDependencies['eslint-plugin-n'] = '^16.1.0';
      break;
    }

    case 'eslint-plugin-unused-imports': {
      pkg.peerDependencies['@typescript-eslint/eslint-plugin'] = '^6.5.0';
      break;
    }

    case '@storybook/html': {
      // Unused.
      delete pkg.peerDependencies['@babel/core'];
      break;
    }

    // Conflict between web-ext and addons-scanner-utils.
    // web-ext > addons-linter > addons-scanner-utils.
    case 'addons-scanner-utils': {
      delete pkg.peerDependencies['node-fetch'];
      break;
    }

    case 'esbuild-plugin-raw': {
      pkg.peerDependencies['esbuild'] = '^0.19.0';
      break;
    }

    case 'ink':
    case 'ink-select-input':
    case 'ink-syntax-highlight':
    case 'ink-text-input':
    case 'react-reconciler': {
      pkg.peerDependencies['react'] = '^18.0.0';
      break;
    }

    // @dxos/presenter
    case '@react-pdf/renderer': {
      pkg.peerDependencies['react'] = '^18.0.0';
      break;
    }

    // @storybook/react transitive dep
    case 'react-element-to-jsx-string': {
      pkg.peerDependencies['react'] = '^18.0.0';
      pkg.peerDependencies['react-dom'] = '^18.0.0';
      break;
    }

    // @storybook/addon-essentials transitive deps
    case 'react-inspector':
    case '@mdx-js/react':
    // https://github.com/FezVrasta/react-resize-aware/issues/59
    case 'react-resize-aware': {
      pkg.peerDependencies['react'] = '^18.0.0';
      break;
    }

    // @dxos/devtools
    case 'react-vis':
    case 'react-motion': {
      pkg.peerDependencies['react'] = '^18.0.0';
      pkg.peerDependencies['react-dom'] = '^18.0.0';
      break;
    }

    // @dxos/devtools-extension
    case '@crxjs/vite-plugin': {
      pkg.peerDependencies['vite'] = '^5.0.0';
      break;
    }

    // https://github.com/dxos/dxos/issues/3330
    case 'simple-hypercore-protocol': {
      pkg.dependencies['noise-protocol'] = '3.0.1';
      break;
    }

    case 'simple-handshake': {
      pkg.dependencies['noise-protocol'] = '3.0.1';
      break;
    }

    case 'storybook-addon-react-router-v6': {
      pkg.peerDependencies['@storybook/addons'] = '^7.0.0-beta';
      pkg.peerDependencies['@storybook/api'] = '^7.0.0-beta';
      pkg.peerDependencies['@storybook/components'] = '^7.0.0-beta';
      pkg.peerDependencies['@storybook/core-events'] = '^7.0.0-beta';
      pkg.peerDependencies['@storybook/theming'] = '^7.0.0-beta';
      break;
    }

    // @dxos/apidoc doesn't work with the latest version of typedoc (yet).
    case 'typedoc': {
      pkg.peerDependencies['typescript'] = '^5.0.0';
      break;
    }

    case 'vite-plugin-fonts': {
      pkg.peerDependencies['vite'] = '^5.0.0';
      break;
    }

    // Ensure zen-push is using the same version of zen-observable.
    case 'zen-push': {
      pkg.dependencies['zen-observable'] = '^0.10.0';
      break;
    }
  }

  return pkg;
}

function afterAllResolved(lockfile, context) {
  return lockfile;
}

function lockfileWarning() {
  const fs = require('fs');
  const cp = require('child_process');

  // get repo root
  const repoRoot = process.env.DX_BUILD_ROOT_DIR ?? cp.execSync('git rev-parse --show-toplevel').toString().trim();

  if (!fs.existsSync(`${repoRoot}/pnpm-lock.yaml`)) {
    if (!process.env.REGENERATE_LOCKFILE) {
      console.log(
        "\n\nRegenerating lockfile from scratch is not recommended. Rerun with REGENERATE_LOCKFILE=1 if you know what you're doing.\n\n\n",
      );
      process.exit(1);
    } else {
      process.on('exit', () => {
        fs.appendFileSync(
          `${repoRoot}/pnpm-lock.yaml`,
          `\n# First generated on ${new Date().toISOString()} by ${process.env.USER}\n`,
        );
      });
    }
  }
}

lockfileWarning();

module.exports = {
  hooks: {
    readPackage,
    afterAllResolved,
  },
};
