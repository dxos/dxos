//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as FileOperation from '@dxos/plugin-file/FileOperation';
import * as PresenterCapabilities from '@dxos/plugin-presenter/PresenterCapabilities';

import { RecorderCapabilities } from '#types';

import { TakeRecorder, saveTake } from '../recorder/index.ts';

/** The recorder service, and the presenter events that drive a take: a slide change marks it, the end stops it. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const registry = yield* Capabilities.AtomRegistry;
    const settings = yield* RecorderCapabilities.Settings;

    const recorder = new TakeRecorder({
      registry,
      settings: () => registry.get(settings),
      save: async (props) => {
        const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
        await saveTake({
          ...props,
          createFile: async (db, file) => {
            const { data, error } = await invokePromise(FileOperation.Create, { db, file });
            if (!data) {
              throw error ?? new Error('file was not created');
            }
            return data.object;
          },
        });
      },
    });

    const isRecording = (presentationId: string) => {
      const state = registry.get(recorder.state);
      return state.status === 'recording' && state.presentationId === presentationId;
    };

    return [
      Capability.contribute(RecorderCapabilities.Recorder, recorder),
      Capability.contribute(PresenterCapabilities.PresentationEventHandler, {
        onSlide: ({ presentation, id, title, step }) => {
          if (isRecording(presentation.id)) {
            recorder.mark({ id, title, step });
          }
        },
        onStop: (presentation) => {
          if (isRecording(presentation.id)) {
            recorder.stop();
          }
        },
      }),
    ];
  }),
);
