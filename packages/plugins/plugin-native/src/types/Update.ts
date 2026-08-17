//
// Copyright 2025 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';

// @import-as-namespace

export type Status =
  // The platform has no OTA channel at all.
  | { kind: 'unsupported' }
  // The platform supports OTA, but this build is served by the dev server.
  | { kind: 'dev' }
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
