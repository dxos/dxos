import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { platform } from 'node:os';
import koffi from 'koffi';
import { LockFile } from './lock-file';

const filename = process.argv[2];

console.log('will lock');

const handle = await LockFile.acquire(filename);
// parents looks for # symbol in the output to know when the lock is acquired
console.log('# locked');

// Close file handle on stdin close.
process.stdin.on('data', (data) => {
  if (data.toString().trim() === 'close') {
    console.log('will unlock');
    LockFile.release(handle);
    console.log('unlocked');
  }
});
