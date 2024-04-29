//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

export class CircularBuffer<T> {
  private readonly _buffer: T[];
  private _nextIndex = 0;
  private _elementCount = 0;

  constructor(size: number) {
    invariant(size >= 1);
    this._buffer = new Array(size);
  }

  public some(predicate: (element: T) => boolean): boolean {
    for (let i = 0; i < this._elementCount; i++) {
      if (predicate(this._buffer[i])) {
        return true;
      }
    }
    return false;
  }

  public push(element: T) {
    this._buffer[this._nextIndex] = element;
    this._nextIndex = (this._nextIndex + 1) % this._buffer.length;
    this._elementCount = Math.min(this._buffer.length, this._elementCount + 1);
  }

  public clear() {
    this._elementCount = 0;
    this._nextIndex = 0;
  }

  public getLast(): T | undefined {
    if (this._elementCount === 0) {
      return undefined;
    }
    if (this._nextIndex === 0) {
      return this._buffer[this._buffer.length - 1];
    }
    return this._buffer[this._nextIndex - 1];
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.values();
  }

  public *values(): IterableIterator<T> {
    if (this._elementCount === 0) {
      return;
    }
    if (this._elementCount < this._buffer.length) {
      for (let i = 0; i < this._elementCount; i++) {
        yield this._buffer[i];
      }
      return;
    }
    for (let i = this._nextIndex; i < this._buffer.length; i++) {
      yield this._buffer[i];
    }
    for (let i = 0; i < this._nextIndex; i++) {
      yield this._buffer[i];
    }
  }
}
