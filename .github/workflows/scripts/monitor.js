const { exec } = require('node:child_process');
const { writeFile, readFile } = require('node:fs/promises');
const { promisify } = require('node:util');

const NEXT = process.argv.slice(2)[0] === '--next';

monitors = [
  './tools/monitors/cli-monitor',
  './tools/monitors/messaging-monitor',
];

const monitor = async (path) => {
  try {
    await promisify(exec)('rm -rf node_modules', { cwd: path });
    if (NEXT) {
      const packagePath = `${path}/package.json`;
      const data = await readFile(packagePath, 'utf-8');
      await writeFile(packagePath, data.replaceAll('latest', 'next'), 'utf-8');
    }
    const { stdout } = await promisify(exec)('npm run start', { cwd: path });
    console.log(`SUCCESS: ${path}`);
    console.log(stdout);
  } catch (err) {
    console.log(`FAILED: ${path}`);
    console.error(err.stdout ?? err);
    throw err;
  }
}

void Promise.allSettled(monitors.map(monitor)).then((results) => {
  const failed = results.some((result) => result.status === 'rejected');
  process.exit(failed ? 1 : 0);
});
