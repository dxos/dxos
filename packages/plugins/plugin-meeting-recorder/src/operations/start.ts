//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as MeetingOperation from '@dxos/plugin-meeting/MeetingOperation';

import { defaultMeetingName } from '#recorder';
import { MeetingRecorderCapabilities, MeetingRecorderOperation } from '#types';

import { MeetingRecorderNamespace } from '../namespace.ts';
import { DETECTED_TOAST_ID } from './handle-detection.ts';

const handler: Operation.WithHandler<typeof MeetingRecorderOperation.Start> = MeetingRecorderOperation.Start.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, app, db: targetDb }) {
      const capabilities = yield* Capability.Service;
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(MeetingRecorderCapabilities.State);
      const current = registry.get(stateAtom);
      if (current.phase === 'recording') {
        return { object: current.meeting };
      }
      invariant(current.phase === 'idle' || current.phase === 'detected', `cannot start while ${current.phase}`);
      // Claimed before the first yield, so a second Start (a double click, the toast and the status bar
      // together) fails the check above instead of recording the same meeting twice.
      registry.set(stateAtom, { phase: 'starting', app });
      const resetOnFailure = Effect.onError(() => Effect.sync(() => registry.set(stateAtom, { phase: 'idle' })));

      const db = yield* Effect.gen(function* () {
        if (targetDb) {
          return targetDb;
        }
        const client = yield* Capability.get(ClientCapabilities.Client);
        const space = AppSpace.getActiveSpace(client, capabilities) ?? AppSpace.getDefaultSpace(client);
        invariant(space, 'no space to record the meeting into');
        yield* Effect.promise(() => space.waitUntilReady());
        return space.db;
      }).pipe(resetOnFailure);

      const { object: meeting } = yield* Operation.invoke(MeetingOperation.Create, {
        name: name ?? defaultMeetingName(app, new Date()),
        db,
      }).pipe(resetOnFailure);

      // Open the meeting first, so its notes are in front of the user while the microphone spins up.
      yield* Operation.invoke(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(meeting)] }).pipe(
        Effect.catch((error) => Effect.sync(() => log.warn('failed to open meeting', { error }))),
      );

      const recorder = yield* Capability.get(MeetingRecorderCapabilities.Recorder);
      const { systemAudio } = yield* Effect.promise(() => recorder.start({ db, meeting, app })).pipe(
        // Nothing was recorded (e.g. the microphone was refused), so leave no empty meeting behind.
        Effect.onError(() => Effect.sync(() => db.remove(meeting))),
        resetOnFailure,
      );
      const latest = registry.get(stateAtom);
      const stopRequested = latest.phase === 'starting' && latest.stopRequested === true;
      registry.set(stateAtom, { phase: 'recording', meeting, app, startedAt: Date.now(), systemAudio });
      if (stopRequested) {
        // The meeting app let go of the microphone while capture was starting.
        yield* Operation.invoke(MeetingRecorderOperation.Stop, {});
        return { object: meeting };
      }

      yield* Operation.invoke(LayoutOperation.AddToast, {
        id: DETECTED_TOAST_ID,
        icon: 'ph--record--regular',
        title: ['recording-started.title', { ns: MeetingRecorderNamespace.key }],
        description: [
          systemAudio ? 'recording-started.description' : 'recording-started-mic-only.description',
          { ns: MeetingRecorderNamespace.key },
        ],
        duration: 4_000,
      }).pipe(Effect.ignore);

      return { object: meeting };
    }),
  ),
);

export default handler;
