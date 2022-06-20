//
// Copyright 2022 DXOS.org
//

interface FileStat {
    size: number
  }

  interface FileInternal {
    read(offset: number, size: number, cb?: (err: Error | null, data?: Buffer) => void): void;

    write(offset: number, data: Buffer, cb?: (err: Error | null) => void): void;

    del(offset: number, data: Buffer, cb?: (err: Error | null) => void): void;

    stat(cb: (err: Error | null, data?: FileStat) => void): void;

    close(cb?: (err: Error | null) => void): void;

    destroy(cb?: (err: Error | null) => void): void
  }

export class File {
    private _fileInternal: FileInternal;
    constructor (fileInternal: FileInternal) {
      this._fileInternal = fileInternal;
    }

    read (offset: number, size: number, cb?: (err: Error | null, data?: Buffer) => void): Promise<Buffer | void> {
      return new Promise<Buffer | void>((resolve, reject) => {
        this._fileInternal.read(offset, size, (err: Error | null, data?: Buffer) => {
          if (typeof cb !== 'undefined') {
            cb(err, data);
          }
          if (err) {
            return reject(err);
          }
          resolve(data);
        });
      });
    }

    write (offset: number, data: Buffer, cb?: (err: Error | null) => void): Promise<Buffer | void> {
      return new Promise<Buffer | void>((resolve, reject) => {
        this._fileInternal.write(offset, data, (err: Error | null) => {
          if (typeof cb !== 'undefined') {
            cb(err);
          }
          if (err) {
            return reject(err);
          }
          resolve(data);
        });
      });
    }

    del (offset: number, data: Buffer, cb?: (err: Error | null) => void): Promise<Buffer | void> {
      return new Promise<Buffer | void>((resolve, reject) => {
        this._fileInternal.del(offset, data, (err: Error | null) => {
          if (typeof cb !== 'undefined') {
            cb(err);
          }
          if (err) {
            return reject(err);
          }
          resolve(data);
        });
      });
    }

    stat (cb?: (err: Error | null, data?: FileStat) => void): Promise<FileStat | void> {
      return new Promise<FileStat | void>((resolve, reject) => {
        this._fileInternal.stat((err: Error | null, data?: FileStat) => {
          if (typeof cb !== 'undefined') {
            cb(err, data);
          }
          if (err) {
            return reject(err);
          }
          resolve(data);
        });
      });
    }

    close (cb?: (err: Error | null) => void): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        this._fileInternal.close((err: Error | null) => {
          if (typeof cb !== 'undefined') {
            cb(err);
          }
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    }

    destroy (cb?: (err: Error | null) => void): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        this._fileInternal.destroy((err: Error | null) => {
          if (typeof cb !== 'undefined') {
            cb(err);
          }
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    }
}
