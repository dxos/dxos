//
// Copyright 2021 DXOS.org
//

/**
 * https://nodejs.org/api/events.html
 */
declare module 'events' {
  /**
   * https://nodejs.org/api/events.html#class-eventemitter
   */
  export interface EventEmitter {
    on (event: string, listener: (...args: any) => void): EventEmitter
    off (event: string, listener: (...args: any) => void): EventEmitter
  }

  export = EventEmitter;
}

/**
 * https://www.npmjs.com/package/nanoresource
 * https://github.com/mafintosh/nanoresource/blob/master/index.js
 */
declare module 'nanoresource' {
  import EventEmitter from 'events';

  import { Callback } from './callback';

  export interface NanoresourceProperties {
    readonly opened: boolean // Once opened this stays true.
    readonly closed: boolean // Cannot be re-opened after closed.
    readonly opening: boolean
    readonly closing: boolean
  }

  export interface Nanoresource extends NanoresourceProperties, EventEmitter {
    open (cb?: Callback<void>): void
    close (cb?: Callback<void>): void
  }

  export = Nanoresource;
}
