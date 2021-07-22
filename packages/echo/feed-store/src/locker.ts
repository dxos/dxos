//
// Copyright 2019 DXOS.org
//

import mutexify from 'mutexify';

type PromiseFunction = () => Promise<void>;

class Locker {
  public _lock: any;

  constructor () {
    this._lock = mutexify();
  }

  lock () {
    return new Promise<PromiseFunction>((resolve) => {
      this._lock((cbRelease: (resolve: () => void) => void) => {
        const release = () => new Promise<void>(resolve => cbRelease(resolve));
        resolve(release);
      });
    });
  }
}

export default Locker;
