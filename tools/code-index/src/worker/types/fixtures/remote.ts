//
// Copyright 2026 DXOS.org
//

export type Remote = { readonly remote: true };

export const helper = (): Remote => ({ remote: true });

export const remoteValue = 1;

export const remoteObject = { count: 1, label: 'x' };

export const makeBox = <T>(value: T): { value: T } => ({ value });
