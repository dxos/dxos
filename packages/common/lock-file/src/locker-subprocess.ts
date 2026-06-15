//
// Copyright 2025 DXOS.org
//

/* eslint-disable no-console */

import { LockFile } from './lock-file';

const filename = process.argv[2];

console.log('will lock');

const handle = await LockFile.acquire(filename);
// parents looks for # symbol in the output to know when the lock is acquired
console.log('# locked');

// Close file handle on stdin close.
process.stdin.on('data', async (data) => {
  if (data.toString().trim() === 'close') {
    console.log('will unlock');
    await LockFile.release(handle);
    console.log('unlocked');
  }
});
