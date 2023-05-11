// https://pnpm.io/pnpmfile

function readPackage(packageJson, context) {
  switch (packageJson.name) {
    // Package has an unneccessarily strict peer dep of 17.0.1
    case '@hot-loader/react-dom': {
      packageJson.peerDependencies['react'] = '^18.0.0'
      break;
    }

    // https://github.com/nrwl/nx/issues/11456#issuecomment-1211214171
    case '@nrwl/nx-cloud': {
      packageJson.dependencies['dotenv'] = '*'
      break;
    }

    case '@nrwl/vite': {
      // We don't use vitest.
      delete packageJson.peerDependencies['vitest']
      break;
    }

    case '@storybook/html': {
      // Unused.
      delete packageJson.peerDependencies['@babel/core'];
      break;
    }

    case '@typescript-eslint/eslint-plugin': 
    case '@typescript-eslint/parser': {
      packageJson.dependencies['eslint'] = '^8.0.0'
      break;
    }

    // Conflict between web-ext and addons-scanner-utils.
    // web-ext > addons-linter > addons-scanner-utils.
    case 'addons-scanner-utils': {
      delete packageJson.peerDependencies['node-fetch']
      break;
    }

    case 'esbuild-plugin-raw': {
      packageJson.peerDependencies['esbuild'] = '^0.16.0'
      break;
    }

    case 'ink':
    case 'ink-select-input':
    case 'ink-syntax-highlight':
    case 'ink-text-input':
    case 'react-reconciler': {
      packageJson.peerDependencies['react'] = '^18.0.0'
      break;
    }

    // @dxos/presenter
    case '@react-pdf/renderer': {
      packageJson.peerDependencies['react'] = '^18.0.0'
      break;
    }

    // @storybook/react transitive dep
    case 'react-element-to-jsx-string': {
      packageJson.peerDependencies['react'] = '^18.0.0'
      packageJson.peerDependencies['react-dom'] = '^18.0.0'
      break;
    }

    // @storybook/addon-essentials transitive deps
    case 'react-inspector':
    case '@mdx-js/react':
    // https://github.com/FezVrasta/react-resize-aware/issues/59
    case 'react-resize-aware': {
      packageJson.peerDependencies['react'] = '^18.0.0'
      break;
    }

    // @dxos/devtools
    case 'react-vis':
    case 'react-motion': {
      packageJson.peerDependencies['react'] = '^18.0.0'
      break;
    }

    // @dxos/devtools-extension
    case '@crxjs/vite-plugin': {
      packageJson.peerDependencies['vite'] = '^4.3.0'
      break;
    }

    case 'storybook-addon-react-router-v6': {
      packageJson.peerDependencies['@storybook/addons'] = '^7.0.0-beta'
      packageJson.peerDependencies['@storybook/api'] = '^7.0.0-beta'
      packageJson.peerDependencies['@storybook/components'] = '^7.0.0-beta'
      packageJson.peerDependencies['@storybook/core-events'] = '^7.0.0-beta'
      packageJson.peerDependencies['@storybook/theming'] = '^7.0.0-beta'
      break;
    }

    // Ensure vuepress uses compatible vite version.
    case '@vuepress/bundler-vite': {
      packageJson.dependencies['vite'] = '^4.3.0'
      break;
    }
    
    // Ensure vuepress uses compatible vite version.
    case '@vitejs/plugin-vue': {
      packageJson.peerDependencies['vite'] = '^4.3.0'
      break;
    }
  }

  return packageJson
}

function afterAllResolved(lockfile, context) {
  return lockfile
}

module.exports = {
  hooks: {
    readPackage,
    afterAllResolved,
  }
}
