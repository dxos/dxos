// https://pnpm.io/pnpmfile

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

function readPackage(packageJson, context) {
  switch (packageJson.name) {
    // Align on single version of buffer polyfill.
    case '@sammacbeth/random-access-idb-mutable-file':
    case 'abstract-leveldown':
    case 'bl':
    case 'crc':
    case 'level-codec':
    case 'level-js':
    case 'random-access-idb-mutable-file':
    case 'unbzip2-stream': {
      packageJson.dependencies['buffer'] = '^6.0.3';
      break;
    }

    // Package has an unneccessarily strict peer dep of 17.0.1
    case '@hot-loader/react-dom': {
      packageJson.peerDependencies['react'] = '^18.0.0';
      break;
    }

    // https://github.com/nrwl/nx/issues/11456#issuecomment-1211214171
    case '@nx/nx-cloud': {
      packageJson.dependencies['dotenv'] = '*';
      break;
    }

    case '@nx/eslint-plugin':
    case '@nrwl/eslint-plugin-nx': {
      packageJson.peerDependencies['@typescript-eslint/parser'] = '^6.5.0';
      break;
    }

    case 'eslint-config-semistandard': {
      packageJson.peerDependencies['eslint-plugin-n'] = '^16.1.0';
      break;
    }

    case 'eslint-plugin-unused-imports': {
      packageJson.peerDependencies['@typescript-eslint/eslint-plugin'] = '^6.5.0';
      break;
    }

    case '@storybook/html': {
      // Unused.
      delete packageJson.peerDependencies['@babel/core'];
      break;
    }

    // Conflict between web-ext and addons-scanner-utils.
    // web-ext > addons-linter > addons-scanner-utils.
    case 'addons-scanner-utils': {
      delete packageJson.peerDependencies['node-fetch'];
      break;
    }

    case 'esbuild-plugin-raw': {
      packageJson.peerDependencies['esbuild'] = '^0.19.0';
      break;
    }

    case 'ink':
    case 'ink-select-input':
    case 'ink-syntax-highlight':
    case 'ink-text-input':
    case 'react-reconciler': {
      packageJson.peerDependencies['react'] = '^18.0.0';
      break;
    }

    // @dxos/presenter
    case '@react-pdf/renderer': {
      packageJson.peerDependencies['react'] = '^18.0.0';
      break;
    }

    // @storybook/react transitive dep
    case 'react-element-to-jsx-string': {
      packageJson.peerDependencies['react'] = '^18.0.0';
      packageJson.peerDependencies['react-dom'] = '^18.0.0';
      break;
    }

    // @storybook/addon-essentials transitive deps
    case 'react-inspector':
    case '@mdx-js/react':
    // https://github.com/FezVrasta/react-resize-aware/issues/59
    case 'react-resize-aware': {
      packageJson.peerDependencies['react'] = '^18.0.0';
      break;
    }

    // @dxos/devtools
    case 'react-vis':
    case 'react-motion': {
      packageJson.peerDependencies['react'] = '^18.0.0';
      packageJson.peerDependencies['react-dom'] = '^18.0.0';
      break;
    }

    // @dxos/devtools-extension
    case '@crxjs/vite-plugin': {
      packageJson.peerDependencies['vite'] = '^5.0.0';
      break;
    }

    // https://github.com/dxos/dxos/issues/3330
    case 'simple-hypercore-protocol': {
      packageJson.dependencies['noise-protocol'] = '3.0.1';
      break;
    }

    case 'simple-handshake': {
      packageJson.dependencies['noise-protocol'] = '3.0.1';
      break;
    }

    case 'storybook-addon-react-router-v6': {
      packageJson.peerDependencies['@storybook/addons'] = '^7.0.0-beta';
      packageJson.peerDependencies['@storybook/api'] = '^7.0.0-beta';
      packageJson.peerDependencies['@storybook/components'] = '^7.0.0-beta';
      packageJson.peerDependencies['@storybook/core-events'] = '^7.0.0-beta';
      packageJson.peerDependencies['@storybook/theming'] = '^7.0.0-beta';
      break;
    }

    // @dxos/apidoc doesn't work with the latest version of typedoc (yet).
    case 'typedoc': {
      packageJson.peerDependencies['typescript'] = '^5.0.0';
      break;
    }

    case 'vite-plugin-fonts': {
      packageJson.peerDependencies['vite'] = '^5.0.0';
      break;
    }

    // Ensure zen-push is using the same version of zen-observable.
    case 'zen-push': {
      packageJson.dependencies['zen-observable'] = '^0.10.0';
      break;
    }
  }

  return packageJson;
}

function afterAllResolved(lockfile, context) {
  return lockfile;
}

module.exports = {
  hooks: {
    readPackage,
    afterAllResolved,
  },
};
