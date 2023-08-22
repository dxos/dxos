//
// Copyright 2020 DXOS.org
//

export const range = (n: number) => Array.from(Array(n).keys());

export const rangeFromTo = (from: number, to: number) => range(to - from).map((i) => i + from);
