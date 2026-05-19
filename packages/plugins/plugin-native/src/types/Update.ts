//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import type * as Effect from 'effect/Effect';

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
  check: () => Effect.Effect<void>;
  install: () => Effect.Effect<void>;
  relaunch: () => Effect.Effect<void>;
};
