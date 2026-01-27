//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';
import { createEditorStateStore } from '@dxos/ui-editor';

import { meta } from '../../meta';
import { MarkdownCapabilities, MarkdownStateSchema } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Persisted state using KVS store.
    const stateAtom = createKvsStore({
      key: `${meta.id}/state`,
      schema: MarkdownStateSchema,
      defaultValue: () => ({ viewMode: {} }),
    });

    // TODO(wittjosiah): Fold into state.
    const editorState = createEditorStateStore(`${meta.id}/editor`);

    return [
      Capability.contributes(MarkdownCapabilities.State, stateAtom),
      Capability.contributes(MarkdownCapabilities.EditorState, editorState),
    ];
  }),
);
