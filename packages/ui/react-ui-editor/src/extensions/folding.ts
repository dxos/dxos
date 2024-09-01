//
// Copyright 2024 DXOS.org
//

import { codeFolding, foldGutter } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { EditorView, GutterMarker } from '@codemirror/view';

import { getSize, mx } from '@dxos/react-ui-theme';

class LineGutterMarker extends GutterMarker {
  override toDOM() {
    const el = document.createElement('div');
    el.className = 'flex items-center text-primary-500';
    el.appendChild(document.createTextNode('→'));
    const svg = el.appendChild(document.createElement('svg'));
    svg.className = mx(getSize(4), 'text-[--icons-color]');
    const use = svg.appendChild(document.createElement('use'));
    // TODO(burdon): Not working.
    use.setAttribute('href', '/icons.svg#ph--caret-right--regular');
    return el;
  }
}

const emptyMarker = new LineGutterMarker();

const emptyDiv = document.createElement('div');

/**
 * https://codemirror.net/examples/gutter
 */
// TODO(burdon): Experimental; side menu?
export const folding: Extension = [
  // gutter({
  //   initialSpacer: () => emptyMarker,
  //   lineMarkerChange: (update) => {
  //     // TODO(burdon): Check if line changed.
  //     return update.selectionSet;
  //   },
  //   lineMarker: (view, line) => {
  //     const active = view.state.selection.ranges.some((range) => range.from >= line.from && range.to <= line.to);
  //     return active ? emptyMarker : null;
  //   },
  // }),
  codeFolding({
    placeholderDOM: () => {
      const el = document.createElement('div');
      // el.appendChild(document.createTextNode('[hidden]'));
      return el;
    },
  }),
  foldGutter({
    markerDOM: (open) => {
      const el = document.createElement('div');
      el.className = 'm-4';
      const button = el.appendChild(document.createElement('div'));
      button.className = mx(
        'flex w-6 h-6 justify-center items-center',
        'rounded-lg border border-black transition duration-200 cursor-pointer',
        open && 'rotate-90',
      );
      button.appendChild(document.createTextNode('x'));
      return el;
    },
  }),
  EditorView.baseTheme({
    '.cm-gutters': {
      // Inside within content margin.
      marginRight: '-32px',
      width: '32px',
      backgroundColor: 'transparent !important',
    },
    '.cm-gutter': {},
    '.cm-gutterElement': {
      display: 'flex',
    },
  }),
];
