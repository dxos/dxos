//
// Copyright 2023 DXOS.org
//

import { existsSync } from 'node:fs';
import { type FileHandle, constants, open } from 'node:fs/promises';
import { platform } from 'node:os';

import koffi from 'koffi';

// flock constants
const LOCK_SH = 1; // Shared lock
const LOCK_EX = 2; // Exclusive lock
const LOCK_NB = 4; // Non-blocking
const LOCK_UN = 8; // Unlock

// Load the appropriate C library based on platform
const getPlatformLibrary = () => {
  switch (platform()) {
    case 'darwin':
      return koffi.load('libc.dylib');
    case 'linux':
      return koffi.load('libc.so.6');
    default:
      throw new Error(`Unsupported platform: ${platform()}`);
  }
};

// Load the library and define the flock function
const lib = getPlatformLibrary();
const flockNative = lib.func('flock', 'int', ['int', 'int']);

/**
 * Wrapper for the flock syscall using koffi.
 */
function flock(fd: number, operation: string): void {
  let op = 0;

  switch (operation) {
    case 'ex':
      op = LOCK_EX;
      break;
    case 'exnb':
      op = LOCK_EX | LOCK_NB;
      break;
    case 'sh':
      op = LOCK_SH;
      break;
    case 'shnb':
      op = LOCK_SH | LOCK_NB;
      break;
    case 'un':
      op = LOCK_UN;
      break;
    default:
      throw new Error(`Invalid flock operation: ${operation}`);
  }

  const result = flockNative(fd, op);

  if (result !== 0) {
    // Get the errno to provide a more meaningful error
    const errno = koffi.errno();
    const errorMessages: { [key: number]: string } = {
      11: 'Resource temporarily unavailable (EAGAIN/EWOULDBLOCK)',
      13: 'Permission denied (EACCES)',
      22: 'Invalid argument (EINVAL)',
      9: 'Bad file descriptor (EBADF)',
      35: 'Resource temporarily unavailable (EAGAIN on macOS)',
    };

    const errorMessage = errorMessages[errno] || `Unknown error (errno: ${errno})`;
    throw new Error(`flock failed: ${errorMessage}`);
  }
}

export class LockFile {
  static async acquire(filename: string): Promise<FileHandle> {
    const handle = await open(filename, constants.O_CREAT | constants.O_RDWR);

    try {
      // Try to acquire exclusive non-blocking lock
      flock(handle.fd, 'exnb');
      return handle;
    } catch (err) {
      // Close the file handle if we can't acquire the lock
      await handle.close();
      throw err;
    }
  }

  static async release(handle: FileHandle): Promise<void> {
    try {
      // Release the lock
      flock(handle.fd, 'un');
    } finally {
      await handle.close();
    }
  }

  static async isLocked(filename: string): Promise<boolean> {
    if (!existsSync(filename)) {
      return false;
    }
    try {
      const handle = await LockFile.acquire(filename);
      await LockFile.release(handle);
      return false;
    } catch (e) {
      return true;
    }
  }
}
