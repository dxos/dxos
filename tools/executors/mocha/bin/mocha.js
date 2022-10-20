#!/usr/bin/env node

const { spawnSync } = require('child_process');

//
// Script called by IDEs.
//

const getArg = (flag) => {
  const idx = process.argv.findIndex(arg => arg.startsWith(flag));
  if (idx === -1) {
    return undefined;
  }

  const value = process.argv[idx].split('=');
  if (value.length === 2) {
    return value[1];
  } else {
    return process.argv[idx + 1];
  }
}

const project = getArg('--project');
const reporter = getArg('--reporter');

spawnSync('pnpm', ['-w', 'nx', 'test', project, '--reporter', `"${reporter}"`], {
  shell: true,
  stdio: 'inherit',
  env: {
    ...process.env
  }
});
