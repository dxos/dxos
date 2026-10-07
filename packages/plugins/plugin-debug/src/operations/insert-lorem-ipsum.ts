//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import { random } from '@dxos/random';
import { insertAtCursor } from '@dxos/ui-editor';

import { DebugOperation } from '#types';

const handler: Operation.WithHandler<typeof DebugOperation.InsertLoremIpsum> = DebugOperation.InsertLoremIpsum.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, head }) {
      const editorViews = yield* Capability.get(MarkdownCapabilities.EditorViews);
      // Callers hold either key — the article registers under its attendable id, the graph knows the
      // object URI — so accept both rather than failing on the one we were not given.
      const entry = editorViews.get(subject) ?? editorViews.getByDocumentId(subject);
      if (!entry) {
        log.warn('no editor view for insert target', { subject });
        return;
      }

      insertAtCursor(entry.view, head, random.lorem.paragraph({ min: 2, max: 8 }));
    }),
  ),
);

export default handler;
