//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

/** The fields a task list can be ordered by; `manual` is the set's own order. */
export const SortField = Schema.Literals(['manual', 'status', 'priority', 'estimate', 'created', 'updated', 'title']);
export type SortField = Schema.Schema.Type<typeof SortField>;

export const SortDirection = Schema.Literals(['asc', 'desc']);
export type SortDirection = Schema.Schema.Type<typeof SortDirection>;

export const Sort = Schema.Struct({ field: SortField, direction: SortDirection });
export type Sort = Schema.Schema.Type<typeof Sort>;

/** The fields a task list can be grouped by; `none` is one ungrouped list. */
export const GroupField = Schema.Literals(['none', 'status', 'priority', 'assignee', 'milestone']);
export type GroupField = Schema.Schema.Type<typeof GroupField>;

export const DEFAULT_SORT: Sort = { field: 'manual', direction: 'asc' };

export const View = Schema.Struct({
  query: Schema.String,
  sort: Schema.optional(Sort),
  group: Schema.optional(GroupField),
});
export type View = Schema.Schema.Type<typeof View>;

/**
 * How a reader has a task set's list arranged, keyed by the set's object id and held per device
 * (`local`): a filter, a sort or a grouping is how this reader looks at the list here, not a property
 * of the set every member would see.
 *
 * The status menu and the text are two views over `query` — the status choice is written into it as
 * `status:` terms — so there is one value to persist and no second copy to drift. `sort` and `group`
 * are optional so a value persisted before they existed still decodes.
 */
export const aspect: ViewState.Aspect<View> = ViewState.define<View>({
  key: 'tasks-task-set-view',
  backend: 'local',
  schema: View,
  defaultValue: () => ({ query: '' }),
});
