//
// Copyright 2026 DXOS.org
//

/** Reports which global scope evaluated the module, proving it was imported in the worker. */
export const realm = (): string => (typeof document === 'undefined' ? 'worker' : 'window');
