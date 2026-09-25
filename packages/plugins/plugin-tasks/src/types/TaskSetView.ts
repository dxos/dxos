//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

/**
 * How a reader has a task set's list narrowed, keyed by the set's object id and held per device
 * (`local`): a filter is how this reader looks at the list here, not a property of the set every
 * member would see. The status menu and the text are two views over `query` — the status choice is
 * written into it as `status:` terms — so there is one value to persist and no second copy to drift.
 */
export const aspect = ViewState.define({
  key: 'tasks-task-set-view',
  backend: 'local',
  schema: Schema.Struct({ query: Schema.String }),
  defaultValue: () => ({ query: '' }),
});
