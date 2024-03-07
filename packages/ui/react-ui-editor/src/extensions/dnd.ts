//
// Copyright 2024 DXOS.org
//

import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

// TODO(burdon): DND experiment.
export const dnd = (): Extension => {
  return EditorView.domEventHandlers({
    drop: (event, view) => {
      console.log(event);
    },
  });
};
