//
// Copyright 2026 DXOS.org
//

import { useEffect, useRef, useState } from 'react';

import { type DeckStateHook } from '#hooks';
import { DeckSchema } from '#types';

import { canTransition, transitionWhenRendered } from './transition.ts';

export type WorkspaceLayerSpec = {
  id: string;
  /** The state the layer renders: the live one, or the last state of the workspace being left. */
  shown: DeckStateHook;
  live: boolean;
  ref: (element: HTMLDivElement | null) => void;
};

const ignore = () => {};

/**
 * The workspaces to render: the live one, and during a switch the one being left, which stays over the entered one
 * until that has rendered and then fades out. Render each as a `WorkspaceLayer` keyed by its `id`.
 */
export const useWorkspaceTransition = (live: DeckStateHook): WorkspaceLayerSpec[] => {
  const current = live.state.activeDeck;
  const frozen = useRef(new Map<string, DeckStateHook>());
  const elements = useRef(new Map<string, HTMLDivElement>());
  const [previous, setPrevious] = useState(current);
  const [leaving, setLeaving] = useState<string>();
  if (previous !== current) {
    setPrevious(current);
    setLeaving(previous !== DeckSchema.DEFAULT_DECK_ID && canTransition() ? previous : undefined);
  }
  // Kept for when this workspace is the one left, which only shows its state: a write from it would land in the next.
  frozen.current.set(current, { ...live, updateState: ignore, updateEphemeral: ignore });

  useEffect(() => {
    for (const map of [frozen.current, elements.current]) {
      for (const id of map.keys()) {
        if (id !== current && id !== leaving) {
          map.delete(id);
        }
      }
    }
    if (!leaving) {
      return;
    }
    const viewport = elements.current.get(leaving)?.firstElementChild;
    const entering = elements.current.get(current);
    if (!(viewport instanceof HTMLElement) || !entering) {
      setLeaving(undefined);
      return;
    }
    return transitionWhenRendered(viewport, entering, () => setLeaving((id) => (id === leaving ? undefined : id)));
  }, [leaving, current]);

  const ids = leaving && leaving !== current ? [leaving, current] : [current];
  return ids.map((id) => ({
    id,
    shown: id === current ? live : (frozen.current.get(id) ?? live),
    live: id === current,
    ref: (element) => {
      if (element) {
        elements.current.set(id, element);
      }
    },
  }));
};
