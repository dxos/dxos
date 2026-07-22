//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { AttentionCapabilities } from '@dxos/plugin-attention';

import { editorViewModeAspect } from '../capabilities/editor-view-state';
import { MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.SetViewMode> = MarkdownOperation.SetViewMode.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id, viewMode }) {
      // Per-document view mode override → ViewState (Pattern B, non-React), keyed by document id.
      const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
      viewState.set(editorViewModeAspect, id, viewMode);
    }),
  ),
);

export default handler;
