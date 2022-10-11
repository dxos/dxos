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
