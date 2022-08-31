// https://pnpm.io/pnpmfile

function readPackage(packageJson, context) {
  switch (packageJson.name) {
    // Package has an unneccessarily strict peer dep of 17.0.1
    case '@hot-loader/react-dom': {
      packageJson.peerDependencies['react'] = '^18.0.0'
      break;
    }

    // TODO(burdon): Can be removed once tutorials-tasks-app is removed or upgraded to MUI5.
    case '@mui/styles': {
      packageJson.peerDependencies['react'] = '^18.0.0'
      packageJson.peerDependencies['@types/react'] = '^18.0.0'
      break;
    }

    // https://github.com/nrwl/nx/issues/11456#issuecomment-1211214171
    case '@nrwl/nx-cloud': {
      packageJson.dependencies['dotenv'] = '*'
      break;
    }

    case '@typescript-eslint/eslint-plugin': 
    case '@typescript-eslint/parser': {
      packageJson.dependencies['eslint'] = '^8.0.0'
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
