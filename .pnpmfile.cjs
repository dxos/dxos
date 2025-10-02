// https://pnpm.io/pnpmfile

function lockfileWarning() {
  if (process.env.NO_LOCKFILE_WARNING) {
    return;
  }

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
  // Ignore all AWS peers.
  const peerDependencies = Object.keys(packageJson.peerDependencies ?? {});
  for (const dep of peerDependencies) {
    if (dep.startsWith('@aws-sdk/') || dep.startsWith('@aws-crypto/')) {
      delete packageJson.peerDependencies[dep];
    }
  }

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

    // TODO(wittjosiah): Remove when bumping @effect-rx/rx-react.
    case '@effect-rx/rx': {
      packageJson.peerDependencies['@effect/platform'] = '*';
      break;
    }

    // Package has an unnecessarily strict peer dep of 17.0.1
    case '@hot-loader/react-dom': {
      packageJson.peerDependencies['react'] = '^18.0.0';
      break;
    }

    case 'eslint-plugin-unused-imports': {
      packageJson.peerDependencies['@typescript-eslint/eslint-plugin'] = '^6.5.0';
      break;
    }

    case 'eslint-plugin-storybook':
    case 'eslint-plugin-prefer-arrow-functions': {
      packageJson.dependencies['@typescript-eslint/types'] = '8.39.0';
      packageJson.dependencies['@typescript-eslint/utils'] = '8.39.0';
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

    case 'detective-typescript': {
      packageJson.dependencies['@typescript-eslint/typescript-estree'] = '8.39.0';
      break;
    }

    case '@rollup/pluginutils': {
      packageJson.peerDependencies['rollup'] = '^2.0.0||^3.0.0';
      break;
    }

    case 'vite-plugin-glslify': {
      packageJson.peerDependencies['vite'] = '^7.0.0';
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
