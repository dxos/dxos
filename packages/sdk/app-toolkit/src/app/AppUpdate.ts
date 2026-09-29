//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/unstable/reactivity/Atom';

/**
 * How far along an update's download is.
 *
 * The unit differs by platform and is carried rather than assumed: a native build downloads one
 * archive and counts bytes, while the web precaches thousands of individual entries and counts those.
 * A byte total means nothing to the web path, and a percentage alone would lose the ability to say
 * "1,240 of 4,372 files".
 */
export type Progress = {
  completed: number;
  total: number;
  unit: 'bytes' | 'entries';
};

/**
 * Where an app is in the update cycle.
 *
 * The union is deliberately a superset: not every platform reaches every state. `available` in
 * particular is native-only — see {@link Manager.install}.
 */
export type Status =
  // The platform has no update channel at all: no OTA on native, no service worker registration on
  // the web (a `DX_PWA=false` build, or a browser that refuses one).
  | { kind: 'unsupported' }
  // The platform supports updates, but this build is served by a dev server.
  | { kind: 'dev' }
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'up-to-date'; checkedAt: number }
  // An update exists and has NOT been downloaded yet. Only reachable where checking and downloading
  // are separate acts, i.e. where `Manager.install` is present.
  | { kind: 'available'; version: string }
  | { kind: 'downloading'; progress?: Progress }
  // Downloaded and staged. `Manager.apply` puts it live.
  | { kind: 'ready' }
  | { kind: 'failed'; error: string };

/**
 * The update surface a platform contributes, so one settings row can drive both.
 *
 * `install` is optional because the platforms genuinely differ, and flattening that would make the
 * web lie. On native, checking and downloading are separate: you learn a version exists, then choose
 * to fetch it. On the web `registration.update()` fetches the worker and the browser installs it as
 * part of checking, so by the time anything could be reported the download has already happened —
 * offering "an update is available, download it?" would be offering a choice that is already made.
 * A platform without a separate download step omits `install` and never reports `available`; the UI
 * keys off its absence rather than a platform flag.
 */
export type Manager = {
  status: Atom.Writable<Status>;
  /** Look for an update. Where `install` is absent this also downloads it. */
  check: () => Promise<void>;
  /** Download a known-available update. Absent where checking already downloads. */
  install?: () => Promise<void>;
  /** Put a `ready` update live — relaunch on native, reload on the web. */
  apply: () => Promise<void>;
};
