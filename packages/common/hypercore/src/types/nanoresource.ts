//
// Copyright 2021 DXOS.org
//

import EventEmitter from 'events';

import { Callback } from '@dxos/random-access-storage';

export interface NanoresourceProperties {
  readonly opened: boolean // Once opened this stays true.
  readonly closed: boolean // Cannot be re-opened after closed.
  readonly opening: boolean
  readonly closing: boolean
}

/**
 * https://www.npmjs.com/package/nanoresource
 * https://github.com/mafintosh/nanoresource/blob/master/index.js
 */
export interface Nanoresource extends NanoresourceProperties, EventEmitter {
  open (cb?: Callback<void>): void
  close (cb?: Callback<void>): void
}
