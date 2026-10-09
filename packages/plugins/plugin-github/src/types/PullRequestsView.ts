//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

/**
 * The fields the pull request list can be ordered by. `relevance` ranks what needs the reader first
 * (see `relevance`); `updated` and `created` are GitHub's times.
 */
export const SortField = Schema.Literals(['relevance', 'updated', 'created', 'number', 'title']);
export type SortField = Schema.Schema.Type<typeof SortField>;

export const SortDirection = Schema.Literals(['asc', 'desc']);
export type SortDirection = Schema.Schema.Type<typeof SortDirection>;

export const Sort = Schema.Struct({ field: SortField, direction: SortDirection });
export type Sort = Schema.Schema.Type<typeof Sort>;

/** The fields the list can be grouped by; `none` is one ungrouped list. */
export const GroupField = Schema.Literals(['none', 'repo', 'state', 'checks', 'author']);
export type GroupField = Schema.Schema.Type<typeof GroupField>;

export const DEFAULT_SORT: Sort = { field: 'relevance', direction: 'desc' };

export const View = Schema.Struct({
  query: Schema.String,
  sort: Schema.optional(Sort),
  group: Schema.optional(GroupField),
});
export type View = Schema.Schema.Type<typeof View>;

/**
 * How a reader has the space's pull requests arranged, keyed by the space and held per device
 * (`local`), as a task set's list is: the filter, order and grouping are how this reader looks at the
 * list here, not a property of the space every member would see.
 */
export const aspect: ViewState.Aspect<View> = ViewState.define<View>({
  key: 'github-pull-requests-view',
  backend: 'local',
  schema: View,
  defaultValue: (): View => ({ query: '' }),
});
