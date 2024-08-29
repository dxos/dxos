//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { layer, RectangleMarker } from '@codemirror/view';

import { invariant } from '@dxos/invariant';

/**
 * Modify the build-in extension.
 */
// TODO(burdon): Submit ISSUE/PR to prevent hack.
export const patchDrawSelection = (extension: Extension): Extension => {
  invariant(Array.isArray(extension), 'Extension must be an array.');
  return extension.map((e, i) => {
    if (i === 2) {
      return selectionLayer;
    }
    return e;
  });
};

/**
 * Clip the rectangle to subtract margins.
 * NOTE: We can't introduce extra padding to the DOM -- or to the calculated rectangle because it will be
 * offset from the actual cursor position.
 */
const selectionLayer = layer({
  above: false,
  markers: (view) => {
    const content = view.contentDOM.getBoundingClientRect();
    const pos = view.coordsAtPos(0)!;
    const margin = pos.left - content.left;
    const contentWidth = content.width - margin * 2;

    return view.state.selection.ranges
      .map((r) => {
        if (r.empty) {
          return [];
        }

        // TODO(burdon): Is this BIDI aware?
        return RectangleMarker.forRange(view, 'cm-selectionBackground', r).map(({ left, top, width, height }, i) => {
          const l = Math.max(left, margin);
          let w = null;
          if (width) {
            if (left > 0) {
              w = Math.min(width, contentWidth - (l - margin));
            } else {
              w = Math.min(width - margin, contentWidth);
            }
          }

          return new RectangleMarker('cm-selectionBackground', l, top, w, height);
        });
      })
      .reduce((a, b) => a.concat(b));
  },
  update: (update, dom) => update.docChanged || update.selectionSet || update.viewportChanged,
  class: 'cm-selectionLayer',
});
