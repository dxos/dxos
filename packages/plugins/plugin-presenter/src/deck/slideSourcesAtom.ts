//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { Obj } from '@dxos/echo';

import { type Presentation } from '#types';

import { type SlideSource, toSlideSources } from './SlideSource.ts';

/**
 * Slide sources in order, re-evaluated as sections change or their targets load.
 */
export const slideSourcesAtom = (presentation: Presentation.Presentation): Atom.Atom<SlideSource[]> =>
  Atom.make((get) => {
    // Resolved per ref because the array overload drops unresolved refs and breaks index alignment.
    const targets = get(Obj.atomProperty(presentation, 'sections')).map((ref) => get(Obj.atomReactive(ref)));
    return toSlideSources(presentation, targets);
  });
