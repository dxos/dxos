//
// Copyright 2024 DXOS.org
//

import { Facet } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

export interface Syncer {
  // TODO(burdon): Rename?
  reconcile(view: EditorView): void;
}

export const syncFacet = Facet.define<Syncer, Syncer>({
  combine: (values) => values.at(-1)!, // Take last.
});
