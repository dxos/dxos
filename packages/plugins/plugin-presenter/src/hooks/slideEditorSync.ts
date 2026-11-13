//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

/** What the slide editor and its preview tell each other about one slide. */
export type SlideEditorSync = {
  /** The editor's cursor offset in the slide's markdown. */
  cursor?: number;
  /** A source range the preview asked the editor to select; `seq` makes a repeated click a new request. */
  select?: { range: [start: number, end: number]; seq: number };
};

/**
 * Shared per slide, so the preview in the plank's companion follows the editor and can move its cursor.
 */
export const slideEditorSyncAtom = Atom.family((_textId: string) =>
  Atom.make<SlideEditorSync>({}).pipe(Atom.keepAlive),
);
