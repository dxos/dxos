//
// Copyright 2021 DXOS.org
//

import EventEmitter from 'events';

import { Callback } from '@dxos/random-access-storage';

export interface NanoresourceProperties {
  readonly opening: boolean
  readonly opened: boolean // Once opened this stays true.
  readonly closing: boolean
  readonly closed: boolean // Cannot be re-opened after closed.
}

/**
 * https://www.npmjs.com/package/nanoresource
 * https://github.com/mafintosh/nanoresource/blob/master/index.js
 */
export interface Nanoresource extends NanoresourceProperties, EventEmitter {
  open (cb?: Callback<void>): void
  close (cb?: Callback<void>): void
}
