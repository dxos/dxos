//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';
import { Task } from '@dxos/types';

const View = Schema.Struct({
  query: Schema.String,
  statuses: Schema.optional(Schema.Array(Task.Status)),
  expanded: Schema.optional(Schema.Record(Schema.String, Schema.Boolean)),
});

export type View = Schema.Schema.Type<typeof View>;

/**
 * How a reader has a task set's list narrowed, keyed by the set's object id and held per device
 * (`local`): a filter is how this reader looks at the list here, not a property of the set every
 * member would see. `statuses` is absent while every status is shown, so the unfiltered list stores
 * nothing a later status would be missing from. `expanded` maps a task id to whether its branch is
 * open; a task absent from it keeps the list's default (open).
 */
export const aspect = ViewState.define({
  key: 'tasks-task-set-view',
  backend: 'local',
  schema: View,
  defaultValue: (): View => ({ query: '' }),
});
