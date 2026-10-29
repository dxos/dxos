//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Obj } from '@dxos/echo';
import type * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as PresenterOperation from '@dxos/plugin-presenter/PresenterOperation';
import * as SlideViewState from '@dxos/plugin-presenter/SlideViewState';
import { useViewStateActions } from '@dxos/react-ui-attention';

import { type RecorderCapabilities } from '#types';

/**
 * Starts a recording — of the whole presentation, or of `slide` alone — and presents the deck from where it begins.
 * Call the result from a click: the recorder opens the media inputs inside it.
 */
export const useStartRecording = (
  recorder: RecorderCapabilities.Recorder | undefined,
  presentation: Presentation.Presentation | undefined,
  slide?: Presentation.Slide,
) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const { update } = useViewStateActions(SlideViewState.aspect, presentation && Obj.getURI(presentation));
  return useCallback(async () => {
    if (!recorder || !presentation || !(await recorder.start({ presentation, slide }))) {
      return;
    }
    const index = slide ? presentation.slides.findIndex((ref) => ref.uri.endsWith(`/${slide.id}`)) : 0;
    update((state) => ({ ...state, index: Math.max(0, index) }));
    // An operation failure is returned, not thrown; the recording must not run without the deck on screen.
    const { error } = await invokePromise(PresenterOperation.SetPresenting, { object: presentation, state: true });
    if (error) {
      recorder.stop();
    }
  }, [recorder, presentation, slide, update, invokePromise]);
};
