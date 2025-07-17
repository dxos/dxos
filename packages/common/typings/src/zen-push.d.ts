//
// Copyright 2023 DXOS.org
//

// Based on https://github.com/DefinitelyTyped/DefinitelyTyped/blob/708214e/types/zen-push/index.d.ts
// but using esm type defs.
declare module 'zen-push' {
  import { type Observable } from 'zen-observable/esm';

  declare class PushStream<T> {
    readonly observable: Observable<T>;
    readonly observed: number;
    next(x: T): void;
    error(e: Error): void;
    complete(x?: any): void;
    static multicast(o: Observable<T>): Observable<T>;
  }

  export = PushStream;
}
