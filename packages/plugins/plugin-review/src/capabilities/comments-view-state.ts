//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

/**
 * Per-subject comments view state (whether resolved threads are shown). Session-only (`memory`),
 * keyed by subject id — replaces the bespoke `CommentCapabilities.ViewState` view store.
 */
export const commentsViewAspect = ViewState.define({
  key: 'comments-view',
  backend: 'memory',
  schema: Schema.Struct({ showResolvedThreads: Schema.Boolean }),
  defaultValue: () => ({ showResolvedThreads: false }),
});
