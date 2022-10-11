//
// Copyright 2021 DXOS.org
//

/**
 * https://www.npmjs.com/package/nanoerror
 */
declare module 'nanoerror' {
  export interface Nanoerror extends Error {
    readonly isNanoerror: boolean

    equals (error: any): boolean
    from (error: any): this
  }

  declare function nanoerror (type: string, format: string): Nanoerror

  export = nanoerror
}
