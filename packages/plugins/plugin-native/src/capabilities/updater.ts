//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { type } from '@tauri-apps/plugin-os';
import { relaunch } from '@tauri-apps/plugin-process';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Match from 'effect/Match';
import * as Schedule from 'effect/Schedule';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { log } from '@dxos/log';

import { meta } from '#meta';

import { TAURI_LOCALHOST_PORT } from '../constants';
import * as NativeCapabilities from '../types/NativeCapabilities';
import type * as Settings from '../types/Settings';
import type * as Update from '../types/Update';

const SUPPORTS_OTA = ['linux', 'macos', 'windows'];

/**
 * CrabNebula channel per user-facing channel. Production ships on `main` — every build bakes its
 * channel into the updater endpoint, so renaming it would strand installs still polling `main`.
 */
const CHANNEL_NAME: Record<Settings.UpdateChannel, string> = { stable: 'main', nightly: 'nightly' };

const DEFAULT_CHANNEL: Settings.UpdateChannel = 'stable';

type UpdateInfo = { version: string; currentVersion: string };

/** Mirrors the `Progress` enum emitted by src-tauri/src/update_channel.rs. */
type ProgressEvent =
  | { event: 'Started'; data: { contentLength?: number } }
  | { event: 'Progress'; data: { chunkLength: number } }
  | { event: 'Finished' };

const PROGRESS_EVENT = 'composer://update-progress';

/**
 * Check the given channel. `allowDowngrade` is only ever set by a deliberate channel switch — a
 * routine check carrying it would walk the user backwards the moment nightly led stable.
 */
const safeCheck = async (
  channel: Settings.UpdateChannel,
  allowDowngrade = false,
): Promise<{ ok: true; update: UpdateInfo | null } | { ok: false; error: string }> => {
  try {
    const update = await invoke<UpdateInfo | null>('check_channel_update', {
      channel: CHANNEL_NAME[channel],
      allowDowngrade,
    });
    return { ok: true, update };
  } catch (error) {
    log.error('failed to check for updates', { channel, error });
    return { ok: false, error: formatError(error) };
  }
};

/** Download + install the given channel's latest build. Progress arrives on `PROGRESS_EVENT`. */
const safeDownloadAndInstall = async (
  channel: Settings.UpdateChannel,
  allowDowngrade = false,
): Promise<{ ok: true; installed: boolean } | { ok: false; error: string }> => {
  try {
    const installed = await invoke<boolean>('install_channel_update', {
      channel: CHANNEL_NAME[channel],
      allowDowngrade,
    });
    return { ok: true, installed };
  } catch (error) {
    log.error('failed to download and install update', { channel, error });
    return { ok: false, error: formatError(error) };
  }
};

/** Extract a user-readable error string from whatever the Tauri updater threw. */
const formatError = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const platform = type();
    const isDevServer = window.location.port !== TAURI_LOCALHOST_PORT;
    const enabled = SUPPORTS_OTA.includes(platform) && !isDevServer;

    const registry = yield* Capabilities.AtomRegistry;
    const { invoke: invokeOperation } = yield* Capabilities.OperationInvoker;
    const settingsAtom = yield* Capability.get(NativeCapabilities.Settings);

    const currentChannel = (): Settings.UpdateChannel => registry.get(settingsAtom).updateChannel ?? DEFAULT_CHANNEL;

    const statusAtom = Atom.make<Update.Status>(enabled ? { kind: 'idle' } : { kind: 'unsupported' }).pipe(
      Atom.keepAlive,
    );

    // Whether the last check found something, so `install` knows there is work to do. The update
    // itself lives in Rust — it is re-resolved there rather than parked across two commands.
    let pendingUpdate: UpdateInfo | null = null;

    // Core: check for an update and update the status atom. Returns the update if available.
    const doCheck = async (channel = currentChannel()): Promise<UpdateInfo | null> => {
      registry.set(statusAtom, { kind: 'checking' });
      log.info('checking for updates', { channel });
      const result = await safeCheck(channel);
      if (!result.ok) {
        pendingUpdate = null;
        registry.set(statusAtom, { kind: 'failed', error: result.error });
        return null;
      }
      const update = result.update;
      if (!update) {
        pendingUpdate = null;
        registry.set(statusAtom, { kind: 'up-to-date', checkedAt: Date.now() });
        return null;
      }
      log.info('update available', { version: update.version });
      pendingUpdate = update;
      registry.set(statusAtom, { kind: 'available', version: update.version });
      return update;
    };

    // Download progress is emitted from Rust rather than returned through a callback, since the
    // install runs entirely inside the command. One listener for the module's lifetime.
    let downloaded = 0;
    let contentLength = 0;
    const unlisten = yield* Effect.promise(() =>
      listen<ProgressEvent>(PROGRESS_EVENT, ({ payload }) => {
        Match.value(payload).pipe(
          Match.when({ event: 'Started' }, (event) => {
            downloaded = 0;
            contentLength = event.data.contentLength ?? 0;
            registry.set(statusAtom, { kind: 'downloading', downloaded, contentLength });
          }),
          Match.when({ event: 'Progress' }, (event) => {
            downloaded += event.data.chunkLength;
            registry.set(statusAtom, { kind: 'downloading', downloaded, contentLength });
          }),
          Match.when({ event: 'Finished' }, () => {
            log.info('download completed');
          }),
          Match.exhaustive,
        );
      }),
    );

    // Core: download + install the given channel's latest build, streaming progress to the status atom.
    const doInstall = async (channel = currentChannel(), allowDowngrade = false): Promise<boolean> => {
      downloaded = 0;
      contentLength = 0;
      registry.set(statusAtom, { kind: 'downloading', downloaded: 0, contentLength: 0 });
      const result = await safeDownloadAndInstall(channel, allowDowngrade);
      if (result.ok) {
        pendingUpdate = null;
        registry.set(statusAtom, result.installed ? { kind: 'ready' } : { kind: 'up-to-date', checkedAt: Date.now() });
        return result.installed;
      }
      registry.set(statusAtom, { kind: 'failed', error: result.error });
      return false;
    };

    const manager: Update.Manager = {
      status: statusAtom,
      check: async () => {
        if (!enabled) {
          return;
        }
        await doCheck();
      },
      install: async () => {
        if (!enabled || !pendingUpdate) {
          return;
        }
        await doInstall();
      },
      relaunch: async () => {
        await relaunch();
      },
      // Persist first so a failed install still leaves the user on the channel they chose, then
      // force the move: the target channel's latest build is a downgrade whenever it trails the
      // running one, which is the normal case going nightly -> stable, and no periodic check would
      // ever offer it.
      switchChannel: async (channel) => {
        registry.set(settingsAtom, { ...registry.get(settingsAtom), updateChannel: channel });
        if (!enabled) {
          return;
        }
        await doInstall(channel, true);
      },
    };

    const managerContribution = Capability.contribute(NativeCapabilities.UpdateManager, manager);

    if (!enabled) {
      log.info('updater disabled', { platform, port: window.location.port });
      yield* Effect.addFinalizer(() => Effect.sync(unlisten));
      return [managerContribution];
    }

    // Background flow: periodic check + auto-install + toast when ready.
    // The toast is the entry point for users who weren't watching the settings panel.
    const backgroundAction = Effect.gen(function* () {
      const update = yield* Effect.promise(() => doCheck());
      if (!update) {
        return true;
      }
      const ok = yield* Effect.promise(() => doInstall());
      if (!ok) {
        return true;
      }
      yield* invokeOperation(LayoutOperation.AddToast, {
        id: `${meta.profile.key}.update-ready`,
        title: ['update-ready.label', { ns: meta.profile.key }],
        description: ['update-ready.description', { ns: meta.profile.key }],
        duration: Infinity,
        actionLabel: ['update.label', { ns: meta.profile.key }],
        actionAlt: ['update.alt', { ns: meta.profile.key }],
        onAction: () => relaunch(),
      });
      return false;
    });

    const schedule = Schedule.fixed(Duration.hours(1)).pipe(
      Schedule.whileInput((keepChecking: boolean) => keepChecking),
    );
    const fiber = yield* backgroundAction.pipe(Effect.repeat(schedule), Effect.forkDaemon);
    log.info('updater module initialized, update check scheduled');

    // Fiber.interrupt is async and would throw AsyncFiberException if wrapped in Effect.runSync,
    // so the finalizer returns the interruption effect directly.
    yield* Effect.addFinalizer(() => Fiber.interrupt(fiber).pipe(Effect.tap(() => Effect.sync(unlisten))));

    return managerContribution;
  }),
);
