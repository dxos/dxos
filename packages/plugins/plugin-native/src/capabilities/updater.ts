//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type } from '@tauri-apps/plugin-os';
import { relaunch } from '@tauri-apps/plugin-process';
import * as Updater from '@tauri-apps/plugin-updater';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Match from 'effect/Match';
import * as Schedule from 'effect/Schedule';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

import { meta } from '#meta';
import { NativeCapabilities, type Update } from '#types';

import { TAURI_LOCALHOST_PORT } from '../constants';

const SUPPORTS_OTA = ['linux', 'macos', 'windows'];

/** Safe wrapper around Updater.check(). */
const safeCheck = async (): Promise<Updater.Update | null> => {
  try {
    return await Updater.check();
  } catch (error) {
    log.error('failed to check for updates', { error });
    return null;
  }
};

/** Safe wrapper around update.downloadAndInstall(). */
const safeDownloadAndInstall = async (
  update: Updater.Update,
  onEvent: (event: Updater.DownloadEvent) => void,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await update.downloadAndInstall(onEvent);
    return { ok: true };
  } catch (error) {
    log.error('failed to download and install update', { error });
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
    if (!enabled) {
      log.info('updater disabled', { platform, port: window.location.port });
    }

    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const { invoke } = yield* Capability.get(Capabilities.OperationInvoker);

    const statusAtom = Atom.make<Update.Status>(enabled ? { kind: 'idle' } : { kind: 'unsupported' }).pipe(
      Atom.keepAlive,
    );

    // Updater.Update is a class with instance methods (downloadAndInstall) and can't live in an
    // atom value; cache it here between check and install.
    let pendingUpdate: Updater.Update | null = null;

    // Core: check for an update and update the status atom. Returns the update if available.
    const doCheck = async (): Promise<Updater.Update | null> => {
      registry.set(statusAtom, { kind: 'checking' });
      log.info('checking for updates');
      const update = await safeCheck();
      if (!update?.available) {
        pendingUpdate = null;
        registry.set(statusAtom, { kind: 'up-to-date', checkedAt: Date.now() });
        return null;
      }
      log.info('update available', { version: update.version });
      pendingUpdate = update;
      registry.set(statusAtom, { kind: 'available', version: update.version });
      return update;
    };

    // Core: download + install the cached pending update, streaming progress to the status atom.
    const doInstall = async (): Promise<boolean> => {
      const update = pendingUpdate;
      if (!update) {
        return false;
      }
      let downloaded = 0;
      let contentLength = 0;
      registry.set(statusAtom, { kind: 'downloading', downloaded: 0, contentLength: 0 });
      const onEvent = Match.type<Updater.DownloadEvent>().pipe(
        Match.when({ event: 'Started' }, (event) => {
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
      const result = await safeDownloadAndInstall(update, onEvent);
      if (result.ok) {
        registry.set(statusAtom, { kind: 'ready' });
        return true;
      }
      registry.set(statusAtom, { kind: 'failed', error: result.error });
      return false;
    };

    const checkForUpdates = async () => {
      if (!enabled) {
        return;
      }
      await doCheck();
    };

    const installUpdate = async () => {
      if (!enabled) {
        return;
      }
      await doInstall();
    };

    const relaunchApp = async () => {
      await relaunch();
    };

    const baseContributions = [
      Capability.contributes(NativeCapabilities.UpdateStatus, statusAtom),
      Capability.contributes(NativeCapabilities.CheckForUpdates, checkForUpdates),
      Capability.contributes(NativeCapabilities.InstallUpdate, installUpdate),
      Capability.contributes(NativeCapabilities.RelaunchApp, relaunchApp),
    ];

    if (!enabled) {
      return baseContributions;
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
      yield* invoke(LayoutOperation.AddToast, {
        id: `${meta.id}.update-ready`,
        title: ['update-ready.label', { ns: meta.id }],
        description: ['update-ready.description', { ns: meta.id }],
        duration: Infinity,
        actionLabel: ['update.label', { ns: meta.id }],
        actionAlt: ['update.alt', { ns: meta.id }],
        onAction: () => relaunch(),
      });
      return false;
    });

    const schedule = Schedule.fixed(Duration.hours(1)).pipe(
      Schedule.whileInput((keepChecking: boolean) => keepChecking),
    );
    const fiber = yield* backgroundAction.pipe(Effect.repeat(schedule), Effect.forkDaemon);
    log.info('updater module initialized, update check scheduled');

    return [
      ...baseContributions,
      Capability.contributes(Capabilities.Null, null, () =>
        Effect.sync(() => Effect.runSync(Fiber.interrupt(fiber))),
      ),
    ];
  }),
);
