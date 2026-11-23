//
// Copyright 2026 DXOS.org
//

import { Prec } from '@codemirror/state';
import React from 'react';

import { type Database, Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { AnchorWidget, EditorView, type Extension, type ObjectLinkProps, objectLinks } from '@dxos/ui-editor';

import { MarkdownCapabilities } from '#types';

import { parseEmbedLabel } from '../components/PreviewComponent/parse-embed-label.ts';
import { PreviewComponent } from '../components/PreviewComponent/PreviewComponent.tsx';

/** An editor's object links: `[label](echo:…)` as a chip, and `![label](echo:…)` as the object's section or card. */
export const objectEmbeds = ({ db, attendableId }: MarkdownCapabilities.ObjectEmbedsOptions): Extension => [
  // The editor keeps the scroll position itself. The browser's own anchoring prefers the focused element, so a focused
  // embed scrolled out of the rendered range pulls the view back toward it.
  Prec.high(EditorView.theme({ '.cm-scroller': { overflowAnchor: 'none' } })),
  objectLinks({
    link: {
      factory: ({ label, eid }: ObjectLinkProps) => {
        // TODO(burdon): Why support both "#" or "@"?
        // A bare `#`/`@` label is a name-less link; resolve the object's actual label once
        // loaded. The resolver is only created when a db exists so `AnchorWidget.eq` sees the
        // db's arrival as a change and rebuilds the chip.
        const resolver = ['#', '@'].indexOf(label) !== -1 && db ? createAnchorLabelResolver(db, eid) : undefined;
        return new AnchorWidget(label, eid, undefined, resolver);
      },
    },
    image: {
      // Reserve the persisted height (`![label|404](…)`) up front so the block does not collapse
      // to the placeholder minimum while the embed resolves (prevents scroll jitter / blank).
      estimatedHeight: ({ label }: ObjectLinkProps) => (label ? parseEmbedLabel(label).height : undefined),
      // An embed that released its reserved height (a card) must still keep its element across
      // rebuilds, or a click that reconfigures the editor remounts it out from under the user.
      keepAlive: true,
      Component: (props) => <PreviewComponent {...props} db={db} attendableId={attendableId} />,
    },
  }),
];

/** Resolves an anchor's display label from the linked object (for name-less `#`/`@` links). */
const createAnchorLabelResolver = (db: Database.Database, eid: string) => async () => {
  const parsed = EID.tryParse(eid);
  if (!parsed) {
    return undefined;
  }
  try {
    const object = await db.makeRef<Obj.Unknown>(parsed).load();
    return Obj.getLabel(object) ?? undefined;
  } catch {
    return undefined;
  }
};
