// https://pnpm.io/pnpmfile

function readPackage(pkg, context) {
  if(pkg.name === '@nrwl/nx-cloud') {
    // https://github.com/nrwl/nx/issues/11456#issuecomment-1211214171
    pkg.dependencies['dotenv'] = '*'
  }

  return pkg
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