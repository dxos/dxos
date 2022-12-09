//
// Copyright 2019 DXOS.org
//

export type AuthProvider = (nonce: Uint8Array) => Promise<Uint8Array | undefined>;

export type AuthVerifier = (nonce: Uint8Array, credential: Uint8Array) => Promise<boolean>;

