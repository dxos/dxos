// https://pnpm.io/pnpmfile
//
// This pnpmfile now only contains DYNAMIC functionality that cannot be expressed
// in the declarative packageExtensions configuration in .npmrc:
//
// 1. Lockfile warning - prevents accidental lockfile regeneration
// 2. AWS SDK peer dependency removal - dynamically removes all @aws-sdk/* and @aws-crypto/* peers
//
// All static package modifications have been migrated to packageExtensions in .npmrc

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
  // Dynamically ignore all AWS peers - cannot be done declaratively in packageExtensions
  const peerDependencies = Object.keys(packageJson.peerDependencies ?? {});
  for (const dep of peerDependencies) {
    if (dep.startsWith('@aws-sdk/') || dep.startsWith('@aws-crypto/')) {
      delete packageJson.peerDependencies[dep];
    }
  }

  // All other package modifications have been moved to packageExtensions in .npmrc
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
