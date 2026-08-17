//
// Copyright 2025 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';

import type * as Settings from './Settings';

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
  /**
   * Move this install to another release channel and pull that channel's latest build now.
   * Not a plain settings write: the channels are ordered against each other (nightly is numbered
   * against the next patch, so it leads stable), which makes a move to stable a downgrade the
   * periodic check would never offer.
   */
  switchChannel: (channel: Settings.UpdateChannel) => Promise<void>;
};
