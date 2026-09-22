//
// Copyright 2026 DXOS.org
//

// Kept out of `PreviewComponent.tsx` for the same reason as `parse-embed-label.ts`: a non-component
// export beside a component defeats react-refresh.

import { EID, URI } from '@dxos/keys';

/**
 * The URI an embed can be resolved against, or `undefined` when the link does not name one yet.
 *
 * `objectLinks` claims a link by its scheme alone, so an embed widget is built from half-typed
 * source on every keystroke — `echo:` and `echo://<spaceId>` both arrive on the way to a complete
 * URI. Resolving either throws from inside the widget's render, where no editor-side catch can
 * reach it, so the document's whole plank is replaced by the error boundary. Returning `undefined`
 * instead routes the link through the component's existing unresolved path, which puts the source
 * text back and leaves it editable.
 *
 * The original spelling is returned rather than the parsed form, so a space-relative `echo:/<id>`
 * embed keeps resolving against the containing document's database exactly as before.
 */
export const parseObjectUri = (eid: string | undefined): URI.URI | undefined => {
  if (!eid) {
    return undefined;
  }
  const parsed = EID.tryParse(eid);
  // A space-only `echo://<spaceId>` parses but names no entity, and resolving that throws too.
  return parsed && EID.getEntityId(parsed) ? URI.make(eid) : undefined;
};
