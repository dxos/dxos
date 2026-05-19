//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

export type Status =
  | { kind: 'unsupported' }
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'up-to-date'; checkedAt: number }
  | { kind: 'available'; version: string }
  | { kind: 'downloading'; downloaded: number; contentLength: number }
  | { kind: 'ready' }
  | { kind: 'failed'; error: string };
