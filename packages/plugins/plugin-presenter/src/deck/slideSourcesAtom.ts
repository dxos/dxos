//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { Obj, type Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { type Presentation } from '#types';

import { type ResolvedSlide, type SlideSource, toSlideSources } from './SlideSource.ts';

/**
 * Slide sources in order, re-evaluated as slides change or their content loads or is deleted.
 * A family so the deck and the navtree connector share one evaluation per presentation.
 */
export const slideSourcesAtom = Atom.family((presentation: Presentation.Presentation): Atom.Atom<SlideSource[]> =>
  Atom.make((get) => {
    // Resolved per ref because the array overload drops unresolved refs and breaks index alignment; the live atom
    // notifies on deletion, the deleted-inclusive one tells a deleted target from an unloaded one.
    const resolve = <T extends Obj.Unknown>(ref: Ref.Ref<T>): T | undefined =>
      get(Obj.atomReactive(ref)) ?? get(Obj.atomReactive([ref], { deleted: 'include' }))[0];
    const resolved = get(Obj.atomProperty(presentation, 'slides')).map((ref): ResolvedSlide => {
      const uri = EID.tryParse(ref.uri);
      const id = (uri && EID.getEntityId(uri)) || ref.uri;
      const slide = resolve(ref);
      const content = slide && !Obj.isDeleted(slide) ? resolve(get(Obj.atomProperty(slide, 'content'))) : undefined;
      return { id, slide, content };
    });
    return toSlideSources(resolved);
  }),
);

/**
 * The positions, in {@link slideSourcesAtom}'s slides, of those shown when the deck is presented: every slide but the
 * hidden ones. Positions rather than slides, since an object linked twice yields two slides with one content.
 */
export const presentedPositionsAtom = Atom.family((presentation: Presentation.Presentation): Atom.Atom<number[]> =>
  Atom.make((get) =>
    get(slideSourcesAtom(presentation)).flatMap((source, position) =>
      source.kind !== 'markdown' && source.slide && get(Obj.atomProperty(source.slide, 'hidden')) ? [] : [position],
    ),
  ),
);
