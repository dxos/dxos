//
// Copyright 2021 DXOS.org
//

/**
 * https://www.npmjs.com/package/nanoresource
 * https://github.com/mafintosh/nanoresource/blob/master/index.js
 */
declare module 'nanoresource' {
  import { Callback } from './callback';

  export class Nanoresource {
    opened: boolean; // Once opened this stays true.
    closed: boolean;
    opening: boolean;
    closing: boolean;

    open (cb?: Callback<void>): void
    close (cb?: Callback<void>): void
  }

  export = Nanoresource;
}
