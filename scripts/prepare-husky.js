//
// Copyright 2024 DXOS.org
//

const { exec } = require('child_process');

if (process.env.HUSKY !== '0') {
  exec('npx husky install', (error, stdout, stderr) => {
    if (error) {
      process.stderr.write(`Error: ${error.message}\n`);
      return;
    }
    if (stderr) {
      process.stderr.write(`stderr: ${stderr}\n`);
      return;
    }
    process.stdout.write(`stdout: ${stdout}\n`);
  });
} else {
  process.stdout.write('Husky not installed\n');
}
