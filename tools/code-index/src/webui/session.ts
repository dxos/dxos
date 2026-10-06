//
// Copyright 2026 DXOS.org
//

import { createSignal, onCleanup } from 'solid-js';

import * as Events from '../workspace/Events.ts';
import * as Fold from '../workspace/Fold.ts';
import { api } from './client.ts';
import * as Pending from './pending.ts';

/**
 * A project, as the browser sees it: one signal holding the fold of its log. Nothing here decides
 * what the state *is* — `Fold.apply` is the server's own reducer, imported rather than
 * reimplemented, which is what keeps a live session and a reload in agreement.
 */

export type Session = {
  readonly state: () => Fold.State;
  /** True while a turn is in flight — the model is thinking or its code is running. */
  readonly busy: () => boolean;
  readonly send: (text: string) => void;
  readonly clearCanvas: () => void;
};

/**
 * Opens a project. Subscribes from sequence 0, so the first thing that arrives is the history;
 * live events follow down the same stream with no seam.
 */
export const openSession = (projectId: string): Session => {
  const [state, setState] = createSignal<Fold.State>(Fold.empty);
  // Covers only the gap between the click and the log echoing this prompt back; from then on the
  // fold's open turns are the answer, which is why a reload mid-turn still shows the agent working.
  const [pending, setPending] = createSignal<Pending.Pending>(Pending.none);

  const stop = api.watch(projectId, 0, (entry) => {
    setState((previous) => Fold.apply(previous, entry));
    setPending((previous) => Pending.settle(previous, entry));
  });
  onCleanup(stop);

  return {
    state,
    busy: () => Pending.isBusy(state(), pending()),
    send: (text) => {
      const turnId = Events.newTurnId();
      setPending((previous) => Pending.add(previous, turnId));
      void api
        .dispatch(projectId, new Events.UserMessage({ text, turnId }))
        .catch(() => setPending((previous) => Pending.remove(previous, turnId)));
    },
    clearCanvas: () => {
      void api.dispatch(projectId, new Events.CanvasCleared({}));
    },
  };
};
