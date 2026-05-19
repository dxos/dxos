//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

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

export type Manager = {
  status: Atom.Writable<Status>;
  check: () => Promise<void>;
  install: () => Promise<void>;
  relaunch: () => Promise<void>;
};
