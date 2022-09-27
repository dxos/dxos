//
// Copyright 2021 DXOS.org
//

export type ValueEncoding = string | {
  encode: (x: any) => Uint8Array
  decode: (data: Uint8Array) => any
};
