//
// Copyright 2019 DXOS.org
//

export type MakeOptional<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> & Partial<Pick<T, K>>;

export type PeerId = Buffer;
export type RawSignature = Uint8Array;
