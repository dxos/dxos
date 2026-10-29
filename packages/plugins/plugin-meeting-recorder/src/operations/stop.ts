//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';
import * as MeetingOperation from '@dxos/plugin-meeting/MeetingOperation';

import { MeetingRecorderCapabilities, MeetingRecorderOperation } from '#types';

import { MeetingRecorderNamespace } from '../namespace.ts';

const handler: Operation.WithHandler<typeof MeetingRecorderOperation.Stop> = MeetingRecorderOperation.Stop.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(MeetingRecorderCapabilities.State);
      const current = registry.get(stateAtom);
      if (current.phase !== 'recording') {
        return;
      }

      const { meeting } = current;
      registry.set(stateAtom, { phase: 'stopping', meeting });
      const recorder = yield* Capability.get(MeetingRecorderCapabilities.Recorder);
      yield* Effect.promise(() => recorder.stop()).pipe(
        Effect.ensuring(Effect.sync(() => registry.set(stateAtom, { phase: 'idle' }))),
      );

      const settings = registry.get(yield* Capability.get(MeetingRecorderCapabilities.Settings));
      const summarize = settings.autoSummarize ?? true;
      yield* Operation.invoke(LayoutOperation.AddToast, {
        id: `${MeetingRecorderNamespace.key}.stopped`,
        icon: 'ph--check-circle--regular',
        title: ['recording-stopped.title', { ns: MeetingRecorderNamespace.key }],
        description: [
          summarize ? 'recording-stopped-summarizing.description' : 'recording-stopped.description',
          {
            ns: MeetingRecorderNamespace.key,
          },
        ],
        duration: 5_000,
      }).pipe(Effect.ignore);

      if (summarize) {
        // Not awaited: a summary takes as long as the model does, and stopping should feel instant.
        const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
        void invokePromise(MeetingOperation.Summarize, { meeting }).catch((err) => log.catch(err));
      }
    }),
  ),
);

export default handler;
