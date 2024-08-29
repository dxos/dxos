//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, gutter, GutterMarker } from '@codemirror/view';

import { getSize, mx } from '@dxos/react-ui-theme';

class LineGutterMarker extends GutterMarker {
  override toDOM() {
    const el = document.createElement('div');
    el.className = 'flex items-center';
    el.appendChild(document.createTextNode('|'));
    const svg = el.appendChild(document.createElement('svg'));
    svg.className = mx(getSize(4), 'text-[--icons-color]');
    const use = svg.appendChild(document.createElement('use'));
    use.setAttribute('href', '/icons.svg#ph--caret-right--regular'); // TODO(burdon): Configure.
    return el;
  }
}

const emptyMarker = new LineGutterMarker();

/**
 * https://codemirror.net/examples/gutter
 */
// TODO(burdon): Experimental; side menu?
export const activeLineGutter: Extension = [
  gutter({
    initialSpacer: () => emptyMarker,
    lineMarkerChange: (update) => {
      // TODO(burdon): Check if line changed.
      return update.selectionSet;
    },
    lineMarker: (view, line) => {
      const active = true; // view.state.selection.ranges.some((range) => range.from >= line.from && range.to <= line.to);
      return active ? emptyMarker : null;
    },
  }),

  EditorView.baseTheme({
    '.cm-gutter': {
      width: '40px',
      backgroundColor: 'transparent !important',
    },
  }),
];
