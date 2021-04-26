//
// Copyright 2021 DXOS.org
//

declare module 'humanhash';

declare module 'nanoerror' {
  declare function nanoerror(type: string, format: string): new (...args: any[]) => Error;
  export = nanoerror;
}
