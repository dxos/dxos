//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as TranscriptionCapabilities from '@dxos/plugin-transcription/TranscriptionCapabilities';

import { MeetingSession, appDisplayName } from '#recorder';
import { MeetingRecorderCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const registry = yield* Capabilities.AtomRegistry;
    let session: MeetingSession | undefined;

    const recorder: MeetingRecorderCapabilities.Recorder = {
      start: async ({ db, meeting, app }) => {
        await session?.stop();
        const settings = registry.get(capabilities.get(MeetingRecorderCapabilities.Settings));
        const next = new MeetingSession({
          // Read at start, not at activation: transcription activates on its own schedule.
          provider: capabilities.get(TranscriptionCapabilities.TranscriptionManagerProvider),
          bridge: capabilities.get(MeetingRecorderCapabilities.Bridge),
          db,
          meeting,
          captureSystemAudio: settings.captureSystemAudio ?? true,
          othersLabel: app ? `${appDisplayName(app)} participants` : 'Participants',
        });
        await next.start();
        session = next;
        return { systemAudio: next.systemAudio };
      },
      stop: async () => {
        const current = session;
        session = undefined;
        await current?.stop();
      },
    };

    yield* Effect.addFinalizer(() => Effect.promise(() => recorder.stop()));
    return Capability.contribute(MeetingRecorderCapabilities.Recorder, recorder);
  }),
);
