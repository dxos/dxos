//
// Copyright 2026 DXOS.org
//

export declare const FOLDERS: string[];
export declare const SCOPES: string[];
export declare const mintKey: () => Promise<{ id: string; key: string; secretHash: string }>;
export declare const sha256: (bytes: Uint8Array) => Promise<string>;
