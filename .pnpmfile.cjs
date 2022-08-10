function readPackage(pkg, context) {
  if(pkg.name === '@nrwl/nx-cloud') {
    pkg.dependencies['dotenv'] = '*'
  }

  return pkg
}

function afterAllResolved(lockfile, context) {
  return lockfile
}

module.exports = {
  readPackage,
  afterAllResolved,
}