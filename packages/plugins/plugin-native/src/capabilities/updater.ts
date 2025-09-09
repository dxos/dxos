//
// Copyright 2025 DXOS.org
//

import { type } from '@tauri-apps/plugin-os';
import { relaunch } from '@tauri-apps/plugin-process';
import { type DownloadEvent, check } from '@tauri-apps/plugin-updater';
import { Duration, Effect, Fiber, Match, Schedule, pipe } from 'effect';

import { Capabilities, LayoutAction, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { log } from '@dxos/log';

import { NATIVE_PLUGIN } from '../meta';

const SUPPORTS_OTA = ['linux', 'macos', 'windows'];

export default (context: PluginContext) => {
  const platform = type();
  if (!SUPPORTS_OTA.includes(platform)) {
    return contributes(Capabilities.Null, null);
  }

  const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);

  // https://tauri.app/plugin/updater/#checking-for-updates
  const action = Effect.gen(function* () {
    log.info('checking for updates');
    const update = yield* Effect.tryPromise(() => check());
    log.info('checked for updates', { version: update?.version, currentVersion: update?.currentVersion });
    if (update) {
      log.info('update available', update);
      let downloaded = 0;
      let contentLength = 0;

      const handleDownload = Match.type<DownloadEvent>().pipe(
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

      yield* Effect.tryPromise(() => update.downloadAndInstall(handleDownload));

      yield* dispatch(
        createIntent(LayoutAction.AddToast, {
          part: 'toast',
          subject: {
            id: `${NATIVE_PLUGIN}/update-ready`,
            title: ['update ready label', { ns: NATIVE_PLUGIN }],
            description: ['update ready description', { ns: NATIVE_PLUGIN }],
            duration: Infinity,
            actionLabel: ['update label', { ns: NATIVE_PLUGIN }],
            actionAlt: ['update alt', { ns: NATIVE_PLUGIN }],
            onAction: () => relaunch(),
          },
        }),
      );
    }
  });

  const fiber = pipe(
    // prettier-ignore
    action,
    Effect.repeat(Schedule.fixed(Duration.hours(1))),
    Effect.runFork,
  );

  return contributes(Capabilities.Null, null, () => {
    Effect.runSync(Fiber.interrupt(fiber));
  });
};
