//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Obj, URI } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Selection } from '@dxos/react-ui-attention/types';

import { type SelectionRange, getSelectionRanges } from '../model/selection';
import { Markdown, MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.GetSelection> = MarkdownOperation.GetSelection.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ doc }) {
      // getAll-style lookup: selection state only exists where a UI is attached (no ViewState in
      // node/workerd), and an absent selection is an empty result, not an error.
      const capabilities = yield* Capability.Service;
      const viewState = capabilities.getAll(AttentionCapabilities.ViewState)[0];
      if (!viewState) {
        return { ranges: [] };
      }

      // With an explicit document, read only its selection; otherwise scan every context holding a
      // selection so the agent gets the current selection in one call rather than probing each open
      // document in turn.
      const keys: string[] = doc ? [Obj.getURI(yield* Database.load(doc))] : viewState.contexts(Selection.aspect);

      const ranges: SelectionRange[] = [];
      for (const key of keys) {
        const selection = viewState.get(Selection.aspect, key);
        // A selection context may key a non-markdown object; resolve past those without failing.
        const document = yield* Database.resolve(URI.make(key), Markdown.Document).pipe(
          Effect.orElseSucceed(() => undefined),
        );
        if (document) {
          ranges.push(...getSelectionRanges(document, selection));
        }
      }

      return { ranges };
    }),
  ),
);

export default handler;
