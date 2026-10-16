//
// Copyright 2026 DXOS.org
//

export type SourceFrame = { package: string | null; source: string; line: number; name?: string };

export declare const createFrameResolver: (
  distDir: string,
) => (script: string, line: number, column: number) => SourceFrame | null;
