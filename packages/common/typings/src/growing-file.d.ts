//
// Copyright 2023 DXOS.org
//

declare module 'growing-file' {
  import type stream from 'node:stream';

  export type OpenOptions = {
    timeout?: number;
    interval?: number;
  };

  export const open: (path: string, opts?: OpenOptions) => stream.Readable;
}
