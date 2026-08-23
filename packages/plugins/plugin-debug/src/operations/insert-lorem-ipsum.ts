//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import { insertAtCursor } from '@dxos/ui-editor';
import { trim } from '@dxos/util';

import { DebugOperation } from '#types';

const LOREM_IPSUM = trim`
  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
  labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
  nisi ut aliquip ex ea commodo consequat.
`;

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

      insertAtCursor(entry.view, head, LOREM_IPSUM);
    }),
  ),
);

export default handler;
