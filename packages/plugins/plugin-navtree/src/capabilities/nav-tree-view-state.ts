//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

/**
 * Per-path navtree expansion, persisted (localStorage) via the ViewState `local` backend keyed by
 * tree path — replaces the hand-rolled single-blob localStorage store. Only `open` is durable; the
 * `current` highlight is ephemeral (driven by the active layout) and never persisted.
 */
export const navTreeOpenAspect = ViewState.define({
  key: 'navtree-open',
  backend: 'local',
  schema: Schema.Struct({ open: Schema.Boolean }),
  defaultValue: () => ({ open: false }),
});
