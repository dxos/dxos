//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';

import { meta } from '#meta';
import { DEFAULT_IGNORED_APPS, appDisplayName, selectMeetingApp } from '#recorder';
import { MeetingRecorderCapabilities, MeetingRecorderOperation } from '#types';

export const DETECTED_TOAST_ID = `${meta.profile.key}.detected`;

/** How long the "take notes?" prompt stays up; the meeting is still offered from the status bar after. */
const PROMPT_DURATION = 30_000;

const handler: Operation.WithHandler<typeof MeetingRecorderOperation.HandleDetection> =
  MeetingRecorderOperation.HandleDetection.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ type, apps }) {
        const registry = yield* Capability.get(Capabilities.AtomRegistry);
        const settings = registry.get(yield* Capability.get(MeetingRecorderCapabilities.Settings));
        const stateAtom = yield* Capability.get(MeetingRecorderCapabilities.State);
        const current = registry.get(stateAtom);
        if (!(settings.detectMeetings ?? true)) {
          return;
        }

        if (type === 'micStarted') {
          if (current.phase !== 'idle') {
            return;
          }
          const app = selectMeetingApp(apps, settings.ignoredApps ?? DEFAULT_IGNORED_APPS);
          if (!app) {
            return;
          }

          log.info('meeting detected', { app });
          if (settings.autoStart) {
            yield* Operation.invoke(MeetingRecorderOperation.Start, { app });
            return;
          }

          registry.set(stateAtom, { phase: 'detected', app });
          const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
          yield* Operation.invoke(LayoutOperation.AddToast, {
            id: DETECTED_TOAST_ID,
            icon: 'ph--record--regular',
            title: ['meeting-detected.title', { ns: meta.profile.key }],
            // Plain text: a toast label carries no interpolation values, and the app name is data.
            description: appDisplayName(app),
            duration: PROMPT_DURATION,
            actionLabel: ['take-notes.label', { ns: meta.profile.key }],
            actionAlt: ['take-notes.alt', { ns: meta.profile.key }],
            onAction: () => {
              void invokePromise(MeetingRecorderOperation.Start, { app }).catch((err) => log.catch(err));
            },
          });
          return;
        }

        const stoppedIds = new Set(apps.map((app) => app.id));
        if (current.phase === 'detected' && stoppedIds.has(current.app.id)) {
          registry.set(stateAtom, { phase: 'idle' });
        } else if (
          current.phase === 'recording' &&
          current.app &&
          stoppedIds.has(current.app.id) &&
          (settings.autoStop ?? true)
        ) {
          log.info('meeting ended', { app: current.app });
          yield* Operation.invoke(MeetingRecorderOperation.Stop, {});
        }
      }),
    ),
  );

export default handler;
