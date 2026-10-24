//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { Obj } from '@dxos/echo';

import { isHiddenSlide } from '#markdown';
import { type Presentation } from '#types';

import { type SlideSource, toSlideSources } from './SlideSource.ts';

/**
 * Slide sources in order, re-evaluated as sections change or their targets load or are deleted.
 * A family so the deck and the navtree connector share one evaluation per presentation.
 */
export const slideSourcesAtom = Atom.family((presentation: Presentation.Presentation): Atom.Atom<SlideSource[]> =>
  Atom.make((get) => {
    // Resolved per ref because the array overload drops unresolved refs and breaks index alignment.
    const targets = get(Obj.atomProperty(presentation, 'sections')).map((ref) => {
      // The live atom notifies on deletion; the deleted-inclusive one tells a deleted target from an unloaded one.
      const live = get(Obj.atomReactive(ref));
      const [included] = get(Obj.atomReactive([ref], { deleted: 'include' }));
      return live ?? included;
    });
    return toSlideSources(presentation, targets);
  }),
);

/**
 * The slides shown when the deck is presented: every slide but those whose frontmatter sets `hide: true`, re-evaluated
 * as their text changes.
 */
export const presentedSlidesAtom = Atom.family((presentation: Presentation.Presentation): Atom.Atom<SlideSource[]> =>
  Atom.make((get) =>
    get(slideSourcesAtom(presentation)).filter((source) => {
      switch (source.kind) {
        case 'text':
          return !isHiddenSlide(get(Obj.atomProperty(source.text, 'content')));
        case 'markdown':
          return !isHiddenSlide(source.content);
        default:
          return true;
      }
    }),
  ),
);
