// https://pnpm.io/pnpmfile

function readPackage(packageJson, context) {
  switch (packageJson.name) {
    // Package has an unneccessarily strict peer dep of 17.0.1
    case '@hot-loader/react-dom': {
      packageJson.peerDependencies['react'] = '^17.0.0'
      break;
    }

    // https://github.com/nrwl/nx/issues/11456#issuecomment-1211214171
    case '@nrwl/nx-cloud': {
      packageJson.dependencies['dotenv'] = '*'
      break;
    }

    // https://github.com/nxext/nx-extensions/issues/755
    case '@nxext/vite': {
      packageJson.peerDependencies['vite'] = '3.0.9'
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
