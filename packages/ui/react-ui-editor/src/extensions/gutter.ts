//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { gutter, GutterMarker } from '@codemirror/view';

class EmptyGutterMarker extends GutterMarker {
  override toDOM() {
    return document.createTextNode('ø');
  }
}

const emptyMarker = new EmptyGutterMarker();

// TODO(burdon): Experimental; side menu?
// https://codemirror.net/examples/gutter
export const emptyLineGutter: Extension = [
  gutter({
    lineMarker: (view, line) => (line.from === line.to ? emptyMarker : null),
    initialSpacer: () => emptyMarker,
  }),
];
