//
// Copyright 2020 DXOS.org
//

// NOTE: `!=` is required.
export const isNode = () => typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
