//
// Copyright 2026 DXOS.org
//

export type RankedBytes = { name: string; bytes: number }[];

export declare const report: (
  profile: unknown,
  options?: { distDir?: string; top?: number; only?: string; frame?: string },
) => { totalBytes: number; byPackage: RankedBytes; byFunction: RankedBytes; byCaller: RankedBytes };
