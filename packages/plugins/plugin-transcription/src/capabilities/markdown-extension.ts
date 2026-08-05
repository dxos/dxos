//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { pendingText } from '@dxos/ui-editor';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Every Markdown editor receives the pending-text extension so the transcription driver can
    // inject live text into it (the driver resolves the editor via `MarkdownCapabilities.EditorViews`).
    return Capability.contribute(MarkdownCapabilities.ExtensionProvider, [() => pendingText()]);
  }),
);
