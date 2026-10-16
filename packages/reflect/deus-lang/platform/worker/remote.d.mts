//
// Copyright 2026 DXOS.org
//

export declare const FOLDERS: string[];
export declare const SCOPES: string[];
export declare const mintKey: () => Promise<{ id: string; key: string; secretHash: string }>;
export declare const sha256: (bytes: Uint8Array) => Promise<string>;
export declare const auditKey: (at: number, keyId: string) => string;
export declare const listAll: (bucket: import('./worker.mjs').Bucket, prefix: string) => Promise<string[]>;
