//
// Copyright 2025 DXOS.org
//

import { type } from '@tauri-apps/plugin-os';
import { relaunch } from '@tauri-apps/plugin-process';
import * as Updater from '@tauri-apps/plugin-updater';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Match from 'effect/Match';
import * as Schedule from 'effect/Schedule';

import { Capability, Common } from '@dxos/app-framework';
import { log } from '@dxos/log';

import { meta } from '../../meta';

const SUPPORTS_OTA = ['linux', 'macos', 'windows'];

/**
 * Safely check for updates with error logging.
 */
const check = async (): Promise<Updater.Update | null> => {
  try {
    return await Updater.check();
  } catch (error) {
    log.error('failed to check for updates', { error });
    return null;
  }
};

/**
 * Safely download and install update with error logging.
 */
const downloadAndInstall = async (
  update: Updater.Update,
  handleDownload: (event: Updater.DownloadEvent) => void,
): Promise<boolean> => {
  try {
    await update.downloadAndInstall(handleDownload);
    return true;
  } catch (error) {
    log.error('failed to download and install update', { error });
    return false;
  }
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Skip updates if not supported or in dev mode.
    const platform = type();
    if (!SUPPORTS_OTA.includes(platform) || window.location.hostname === 'localhost') {
      log.info('skipping updater', { platform, hostname: window.location.hostname });
      return;
    }

    const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);

    // https://tauri.app/plugin/updater/#checking-for-updates
    const action = Effect.gen(function* () {
      log.info('checking for updates');
      const update = yield* Effect.promise(() => check());
      if (!update) {
        log.info('no update available');
        return;
      }
      log.info('update check complete', {
        available: update.available,
        currentVersion: update.currentVersion,
        version: update.version,
        date: update.date,
        body: update.body,
      });
      if (update.available) {
        log.info('update available, starting download', { version: update.version });
        let downloaded = 0;
        let contentLength = 0;

        const handleDownload = Match.type<Updater.DownloadEvent>().pipe(
          Match.when({ event: 'Started' }, (event) => {
            contentLength = event.data.contentLength ?? 0;
            log.info('download started', { contentLength });
          }),
          Match.when({ event: 'Progress' }, (event) => {
            downloaded += event.data.chunkLength;
            log.verbose('download progress', { downloaded, contentLength });
          }),
          Match.when({ event: 'Finished' }, () => {
            log.info('download completed');
          }),
          Match.exhaustive,
        );

        const downloadSuccess = yield* Effect.promise(() => downloadAndInstall(update, handleDownload));

        if (downloadSuccess) {
          yield* invoke(Common.LayoutOperation.AddToast, {
            id: `${meta.id}/update-ready`,
            title: ['update ready label', { ns: meta.id }],
            description: ['update ready description', { ns: meta.id }],
            duration: Infinity,
            actionLabel: ['update label', { ns: meta.id }],
            actionAlt: ['update alt', { ns: meta.id }],
            onAction: () => relaunch(),
          });
        }
      }
    });

    // Run immediately on startup, then repeat every hour.
    const fiber = yield* action.pipe(Effect.repeat(Schedule.fixed(Duration.hours(1))), Effect.forkDaemon);
    log.info('updater module initialized, update check scheduled');

    return Capability.contributes(Common.Capability.Null, null, () =>
      Effect.sync(() => Effect.runSync(Fiber.interrupt(fiber))),
    );
  }),
);
