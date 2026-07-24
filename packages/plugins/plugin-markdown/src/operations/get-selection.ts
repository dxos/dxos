//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Selection } from '@dxos/react-ui-attention';

import { getSelectionRanges } from '../model/selection';
import { MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.GetSelection> = MarkdownOperation.GetSelection.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ doc }) {
      const document = yield* Database.load(doc);
      // getAll-style lookup: selection state only exists where a UI is attached (no ViewState in
      // node/workerd), and an absent selection is an empty result, not an error.
      const capabilities = yield* Capability.Service;
      const viewState = capabilities.getAll(AttentionCapabilities.ViewState)[0];
      if (!viewState) {
        return { ranges: [] };
      }

      const selection = viewState.get(Selection.aspect, Obj.getURI(document));
      return { ranges: getSelectionRanges(document, selection) };
    }),
  ),
);

export default handler;
