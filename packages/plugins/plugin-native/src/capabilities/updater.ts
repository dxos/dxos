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
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationInvoker } from '@dxos/operation';

import { meta } from '#meta';
import { NativeCapabilities, type Update } from '#types';

import { TAURI_LOCALHOST_PORT } from '../constants';

const SUPPORTS_OTA = ['linux', 'macos', 'windows'];

/** Safe wrapper around Updater.check(). Distinguishes "no update" (ok with null update) from a thrown error. */
const safeCheck = async (): Promise<{ ok: true; update: Updater.Update | null } | { ok: false; error: string }> => {
  try {
    return { ok: true, update: await Updater.check() };
  } catch (error) {
    log.error('failed to check for updates', { error });
    return { ok: false, error: formatError(error) };
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

    const registry = yield* Capabilities.AtomRegistry;
    const { invoke } = yield* Capabilities.OperationInvoker;

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
      const result = await safeCheck();
      if (!result.ok) {
        pendingUpdate = null;
        registry.set(statusAtom, { kind: 'failed', error: result.error });
        return null;
      }
      const update = result.update;
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

    const manager: Update.Manager = {
      status: statusAtom,
      check: async () => {
        if (!enabled) {
          return;
        }
        await doCheck();
      },
      install: async () => {
        if (!enabled) {
          return;
        }
        await doInstall();
      },
      relaunch: async () => {
        await relaunch();
      },
    };

    const managerContribution = Capability.provide(NativeCapabilities.UpdateManager, manager);

    if (!enabled) {
      log.info('updater disabled', { platform, port: window.location.port });
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
      yield* invoke(LayoutOperation.AddToast, {
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
    yield* Effect.addFinalizer(() => Fiber.interrupt(fiber));

    return [managerContribution];
  }),
);
