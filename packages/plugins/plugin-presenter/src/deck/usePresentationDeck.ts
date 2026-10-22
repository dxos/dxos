//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import { Obj } from '@dxos/echo';

import { type Presentation } from '#types';

import { type SlideSource, toSlideSources } from './SlideSource.ts';

/**
 * The presentation's slides in order; re-evaluates as sections change or their targets load.
 */
export const usePresentationDeck = (presentation: Presentation.Presentation): SlideSource[] => {
  // Resolved per ref because the array overload drops unresolved refs and breaks index alignment.
  const targetsAtom = useMemo(
    () => Atom.make((get) => get(Obj.atomProperty(presentation, 'sections')).map((ref) => get(Obj.atomReactive(ref)))),
    [presentation],
  );
  const targets = useAtomValue(targetsAtom);
  return useMemo(() => toSlideSources(presentation, targets), [presentation, targets]);
};
