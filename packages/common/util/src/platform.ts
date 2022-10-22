//
// Copyright 2020 DXOS.org
//

export const isNode = () => typeof process !== 'undefined' && process.versions !== null && process.versions.node !== null;
