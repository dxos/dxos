//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { PwaNamespace } from '../namespace.ts';
import { isPrecacheProgress } from '../precache.ts';

// Separate from `RegisterPwa` so that an app without the progress registry still registers the
// service worker - only the meter is lost, not the update flow itself.
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Optional, so that the comment above holds: requiring it would fail the whole plugin - and with
    // it the service-worker registration - on a host that omits plugin-progress.
    const registryOption = yield* Capability.getOption(AppCapabilities.ProgressRegistry);
    if (Option.isNone(registryOption)) {
      return [];
    }
    const registry = registryOption.value;

    let monitor: AppCapabilities.ProgressMonitor | undefined;
    const handleMessage = (event: MessageEvent) => {
      if (!isPrecacheProgress(event.data)) {
        return;
      }

      const { current, total, isUpdate, done } = event.data;
      if (done && !monitor) {
        // Completion for a download this window never saw start - nothing to report.
        return;
      }

      monitor ??= registry.register(`${PwaNamespace.key}.precache`, {
        label: isUpdate ? 'Downloading app update' : 'Preparing offline use',
        total,
      });
      monitor.total(total);
      monitor.set(current);
      if (done) {
        monitor.done();
        // Transient monitor: the download is a one-shot, so drop it rather than leave a completed
        // row in the registry until the next reload.
        monitor.remove();
        monitor = undefined;
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        navigator.serviceWorker?.removeEventListener('message', handleMessage);
        monitor?.remove();
      }),
    );
    return [];
  }),
);
