//
// Copyright 2025 DXOS.org
//

import { type } from '@tauri-apps/plugin-os';
import { relaunch } from '@tauri-apps/plugin-process';
import { type DownloadEvent, check } from '@tauri-apps/plugin-updater';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Function from 'effect/Function';
import * as Match from 'effect/Match';
import * as Schedule from 'effect/Schedule';

import { Capabilities, Capability, LayoutAction, createIntent } from '@dxos/app-framework';
import { log } from '@dxos/log';

import { meta } from '../meta';

const SUPPORTS_OTA = ['linux', 'macos', 'windows'];

export default Capability.makeModule((context) => {
  // Skip updates if not supported or in dev mode.
  const platform = type();
  if (!SUPPORTS_OTA.includes(platform) || window.location.hostname === 'localhost') {
    return Capability.contributes(Capabilities.Null, null);
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
            id: `${meta.id}/update-ready`,
            title: ['update ready label', { ns: meta.id }],
            description: ['update ready description', { ns: meta.id }],
            duration: Infinity,
            actionLabel: ['update label', { ns: meta.id }],
            actionAlt: ['update alt', { ns: meta.id }],
            onAction: () => relaunch(),
          },
        }),
      );
    }
  });

  const fiber = Function.pipe(
    // prettier-ignore
    action,
    Effect.repeat(Schedule.fixed(Duration.hours(1))),
    Effect.runFork,
  );

  return Capability.contributes(Capabilities.Null, null, () => {
    Effect.runSync(Fiber.interrupt(fiber));
  });
});
