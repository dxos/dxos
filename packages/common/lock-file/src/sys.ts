import type * as koffi from 'koffi';
import { platform } from 'node:os';

// flock constants
const LOCK_SH = 1; // Shared lock
const LOCK_EX = 2; // Exclusive lock
const LOCK_NB = 4; // Non-blocking
const LOCK_UN = 8; // Unlock

export class LockfileSys {
  private _init: Promise<void> | null = null;

  private _koffi: typeof koffi | null = null;
  private _libc: koffi.IKoffiLib | null = null;
  private _flockNative: koffi.KoffiFunction | null = null;

  async init() {
    await (this._init ??= this._runInit());
  }

  private async _runInit() {
    this._koffi = await import('koffi');
    switch (platform()) {
      case 'darwin':
        this._libc = this._koffi.load('libc.dylib');
        break;
      case 'linux':
        this._libc = this._koffi.load('libc.so.6');
        break;
      default:
        throw new Error(`Unsupported platform: ${platform()}`);
    }
    this._flockNative = this._libc.func('flock', 'int', ['int', 'int']);
  }

  flock(fd: number, operation: string) {
    if (!this._flockNative) {
      throw new Error('flock not initialized');
    }
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

    const result = this._flockNative!(fd, op);

    if (result !== 0) {
      // Get the errno to provide a more meaningful error
      const errno = this._koffi!.errno();
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
}
