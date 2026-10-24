//
// Copyright 2026 DXOS.org
//

import { type Database, Obj } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { Presentation } from '#types';

/**
 * One slide of a deck: an owned Text, a linked object, raw markdown (with the database its embeds resolve in), or a
 * slide whose content has not loaded yet. A presentation's sources carry their `Slide` (whose id is theirs); a
 * previewed document's markdown slides have none.
 */
export type SlideSource =
  | { kind: 'text'; id: string; text: Text.Text; slide?: Presentation.Slide }
  | { kind: 'object'; id: string; object: Obj.Unknown; slide?: Presentation.Slide }
  | { kind: 'markdown'; id: string; content: string; db?: Database.Database }
  | { kind: 'pending'; id: string; slide?: Presentation.Slide };

/** A presentation's slide with its content resolved; `content` is undefined until it loads. */
export type ResolvedSlide = { id: string; slide?: Presentation.Slide; content?: Obj.Unknown };

/**
 * Maps a presentation's slides to slide sources. A slide (or its content) not loaded yet is `pending`; a deleted one
 * is omitted, so the deck never waits on it.
 */
export const toSlideSources = (resolved: ReadonlyArray<ResolvedSlide>): SlideSource[] =>
  resolved.flatMap(({ id, slide, content }): SlideSource[] => {
    if (!slide || !content) {
      return [{ kind: 'pending', id, slide }];
    }
    if (Obj.isDeleted(slide) || Obj.isDeleted(content)) {
      return [];
    }
    if (Presentation.isOwnedContent(slide, content)) {
      return [{ kind: 'text', id, text: content, slide }];
    }
    return [{ kind: 'object', id, object: content, slide }];
  });
