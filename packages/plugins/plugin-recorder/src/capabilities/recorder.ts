//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { log } from '@dxos/log';
import * as FileOperation from '@dxos/plugin-file/FileOperation';
import * as PresenterCapabilities from '@dxos/plugin-presenter/PresenterCapabilities';
import * as PresenterOperation from '@dxos/plugin-presenter/PresenterOperation';

import { RecorderCapabilities } from '#types';

import { TakeRecorder, saveTake } from '../recorder/index.ts';

/** The recorder service, and the presenter events that drive it: a slide change splits the take, the end stops it. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const registry = yield* Capabilities.AtomRegistry;
    const settings = yield* RecorderCapabilities.Settings;
    const invoker = () => capabilities.get(Capabilities.OperationInvoker);

    const recorder = new TakeRecorder({
      registry,
      settings: () => registry.get(settings),
      save: async (props) => {
        await saveTake({
          ...props,
          createFile: async (db, file) => {
            const { data, error } = await invoker().invokePromise(FileOperation.Create, { db, file });
            if (!data) {
              throw error ?? new Error('file was not created');
            }
            return data.object;
          },
        });
      },
      // A one-slide recording ends when the reader leaves the slide, and so does the presentation.
      onDone: (presentation) =>
        void invoker()
          .invokePromise(PresenterOperation.SetPresenting, { object: presentation, state: false })
          .catch((err) => log.catch(err)),
    });

    const isActive = (presentationId: string) => {
      const state = registry.get(recorder.state);
      return state.status !== 'idle' && state.presentationId === presentationId;
    };

    return [
      Capability.contribute(RecorderCapabilities.Recorder, recorder),
      Capability.contribute(PresenterCapabilities.PresentationEventHandler, {
        onSlide: ({ presentation, slide, id, step }) => {
          if (isActive(presentation.id)) {
            recorder.mark({ slide, id, step });
          }
        },
        onStop: (presentation) => {
          if (isActive(presentation.id)) {
            recorder.stop();
          }
        },
      }),
    ];
  }),
);
