//
// Copyright 2026 DXOS.org
//

import { createSignal, onCleanup } from 'solid-js';

import * as Events from '../workspace/Events.ts';
import * as Fold from '../workspace/Fold.ts';
import { api } from './client.ts';

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
  // Covers only the gap between the click and the log echoing the message back; from then on the
  // fold's `running` is the answer, which is why a reload mid-turn still shows the agent working.
  const [sending, setSending] = createSignal(false);

  const stop = api.watch(projectId, 0, (entry) => {
    setState((previous) => Fold.apply(previous, entry));
    if (entry.event._tag === 'UserMessage') {
      setSending(false);
    }
  });
  onCleanup(stop);

  return {
    state,
    busy: () => sending() || state().running,
    send: (text) => {
      setSending(true);
      void api.dispatch(projectId, new Events.UserMessage({ text })).catch(() => setSending(false));
    },
    clearCanvas: () => {
      void api.dispatch(projectId, new Events.CanvasCleared({}));
    },
  };
};
