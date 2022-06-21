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

    read (offset: number, size: number, cb?: (err: Error | null, data?: Buffer) => void): Promise<Buffer> {
      const promise = new Promise<Buffer>((resolve, reject) => {
        this._fileInternal.read(offset, size, (err: Error | null, data?: Buffer) => {
          cb?.(err, data);
          if (err) {
            return reject(err);
          }
          return resolve(data as Buffer);
        });
      });
      if (cb) {
        promise.catch((_) => {});
      }
      return promise;
    }

    write (offset: number, data: Buffer, cb?: (err: Error | null) => void): Promise<void> {
      const promise = new Promise<void>((resolve, reject) => {
        this._fileInternal.write(offset, data, (err: Error | null) => {
          cb?.(err);
          if (err) {
            return reject(err);
          }
          return resolve();
        });
      });
      if (cb) {
        promise.catch((_) => {});
      }
      return promise;
    }

    del (offset: number, data: Buffer, cb?: (err: Error | null) => void): Promise<void> {
      const promise = new Promise<void>((resolve, reject) => {
        this._fileInternal.del(offset, data, (err: Error | null) => {
          cb?.(err);
          if (err) {
            return reject(err);
          }
          return resolve();
        });
      });
      if (cb) {
        promise.catch((_) => {});
      }
      return promise;
    }

    stat (cb?: (err: Error | null, data?: FileStat) => void): Promise<FileStat> {
      const promise = new Promise<FileStat>((resolve, reject) => {
        this._fileInternal.stat((err: Error | null, data?: FileStat) => {
          cb?.(err, data);
          if (err) {
            return reject(err);
          }
          return resolve(data as FileStat);
        });
      });
      if (cb) {
        promise.catch((_) => {});
      }
      return promise;
    }

    close (cb?: (err: Error | null) => void): Promise<void> {
      const promise = new Promise<void>((resolve, reject) => {
        this._fileInternal.close((err: Error | null) => {
          cb?.(err);
          if (err) {
            return reject(err);
          }
          return resolve();
        });
      });
      if (cb) {
        promise.catch((_) => {});
      }
      return promise;
    }

    destroy (cb?: (err: Error | null) => void): Promise<void> {
      const promise = new Promise<void>((resolve, reject) => {
        this._fileInternal.destroy((err: Error | null) => {
          cb?.(err);
          if (err) {
            return reject(err);
          }
          return resolve();
        });
      });
      if (cb) {
        promise.catch((_) => {});
      }
      return promise;
    }
}
