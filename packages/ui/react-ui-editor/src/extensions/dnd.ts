//
// Copyright 2024 DXOS.org
//

import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { log } from '@dxos/log';

// TODO(burdon): DND experiment.
export const dnd = (): Extension => {
  return EditorView.domEventHandlers({
    drop: (event, view) => {
      log.info('domEventHandlersDrop', { event });
    },
  });
};
