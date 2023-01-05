const { exec } = require('node:child_process');
const { writeFile, readFile } = require('node:fs/promises');
const semver = require('semver');

const releasePleaseConfig = require('../../../release-please-config.json');
const releasePleaseManifest = require('../../../.release-please-manifest.json');
const { promisify } = require('node:util');

const bump = async () => {
  const { stdout: hash } = await promisify(exec)('git rev-parse --short HEAD');

  const {
    packages: {
      '.': { 'extra-files': extraFiles }
    }
  } = releasePleaseConfig;

  const { '.': currentVersion } = releasePleaseManifest;
  // Prerelease bumps A.B.C to A.B.C-next.0, we're replacing the 0 with the git short hash.
  const version = `${semver.inc(currentVersion, 'prerelease', 'next').slice(0, -1)}${hash.trim()}`;

  console.log(`Bumping release files to ${version}...`);

  extraFiles.forEach(async (file) => {
    // TODO(wittjosiah): Assuming string file is @dxos/client version.
    if (typeof file === 'string') {
      const contents = `export const DXOS_VERSION = "${version}";`;
      await writeFile(file, contents, 'utf-8');
      return;
    }

    if (typeof file === 'object' && file.type === 'json') {
      const data = JSON.parse(await readFile(file.path, 'utf-8'));
      data.version = version;
      await writeFile(file.path, JSON.stringify(data, null, 2), 'utf-8');
      return;
    }

    console.warn('Skipping file', file);
  });
};

void bump();
