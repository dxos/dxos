//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { layer, RectangleMarker } from '@codemirror/view';

import { invariant } from '@dxos/invariant';

/**
 * Modify the build-in extension from @codemirror/view.
 */
export const patchDrawSelection = (extension: Extension): Extension => {
  invariant(Array.isArray(extension) && extension.length === 5, 'Invalid extension.');
  return extension.map((extension, i) => {
    // TODO(burdon): Submit ISSUE/PR to prevent hack.
    if (i === 2) {
      return selectionLayer;
    }
    return extension;
  });
};

/**
 * Clip the rectangle to subtract margins.
 * The default selection layer draws the selection rectangle from the left edge of the content DOM.
 * NOTE: We can't introduce extra padding to the DOM -- or to the calculated rectangle because it will be
 * offset from the actual cursor position.
 */
const selectionLayer = layer({
  above: false,
  markers: (view) => {
    // Calculate the content width.
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
        // Clamp the selection to the content width.
        return RectangleMarker.forRange(view, 'cm-selectionBackground', r).map(({ left, top, width, height }) => {
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
  update: (update, _dom) => update.docChanged || update.selectionSet || update.viewportChanged,
  class: 'cm-selectionLayer',
});
