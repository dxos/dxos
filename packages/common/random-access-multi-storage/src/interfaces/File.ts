//
// Copyright 2022 DXOS.org
//

interface FileStat {
    size: number
  }

interface CallBack<DataType> {
  (err: Error | null, data?: DataType): void;
}

export interface FileInternal {
  read(offset: number, size: number, cb?: CallBack<Buffer>): void;

  write(offset: number, data: Buffer, cb?: CallBack<void>): void;

  del(offset: number, data: Buffer, cb?: CallBack<void>): void;

  stat(cb: CallBack<FileStat>): void;

  close(cb?: CallBack<void>): void;

  destroy(cb?: CallBack<void>): void
}

export class File {
  constructor (private readonly _fileInternal: FileInternal) {}

  private _createPromise<Type> (fileMethod: (...args: any[]) => void, cb?: CallBack<Type>, ...args: (number | Buffer)[]): Promise<Type> {
    const promise = new Promise<Type>(
      (resolve, reject) => {
        fileMethod(...args, (err: Error | null, data?: Type) => {
          cb?.(err, data);
          if (err) {
            return reject(err);
          }
          return resolve(data as Type);
        });
      });
    if (cb) {
      promise.catch((_) => {});
    }
    return promise;
  }

  read (offset: number, size: number, cb?: CallBack<Buffer>): Promise<Buffer> {
    return this._createPromise<Buffer>(this._fileInternal.read.bind(this._fileInternal), cb, offset, size);
  }

  write (offset: number, data: Buffer, cb?: CallBack<void>): Promise<void> {
    return this._createPromise<void>(this._fileInternal.write.bind(this._fileInternal), cb, offset, data);
  }

  del (offset: number, data: Buffer, cb?: CallBack<void>): Promise<void> {
    return this._createPromise<void>(this._fileInternal.del.bind(this._fileInternal), cb, offset, data);
  }

  stat (cb?: CallBack<FileStat>): Promise<FileStat> {
    return this._createPromise<FileStat>(this._fileInternal.stat.bind(this._fileInternal), cb);
  }

  close (cb?: CallBack<void>): Promise<void> {
    return this._createPromise<void>(this._fileInternal.close.bind(this._fileInternal), cb);
  }

  destroy (cb?: CallBack<void>): Promise<void> {
    return this._createPromise<void>(this._fileInternal.destroy.bind(this._fileInternal), cb);
  }
}
