//
// Copyright 2026 DXOS.org
//

import { type EnumProperty, parseEnumTerms, writeEnumTerms } from '@dxos/echo-query';
import { Task } from '@dxos/types';

/** Every status the schema offers, in the order the schema lists them. */
export const ALL_STATUSES: readonly Task.Status[] = Task.StatusOptions.map(({ id }) => id);

/**
 * The `status:` terms of a task query, as the status menu reads and writes them — so the menu and
 * the query text are two views over one string (see `parseEnumTerms`).
 */
export const STATUS_TERMS: EnumProperty<Task.Status> = { property: 'status', values: ALL_STATUSES };

/**
 * `query` with a status choice stored apart from it written in as `status:` terms.
 *
 * A query with a top-level `OR` takes no written term, so it is grouped first rather than dropping
 * the choice: `a OR b` with `done` hidden becomes `NOT status:done (a OR b)`.
 */
export const foldStatuses = (query: string, statuses: readonly Task.Status[]): string => {
  const written = writeEnumTerms(query, STATUS_TERMS, statuses);
  const unwritable =
    written === query &&
    parseEnumTerms(query, STATUS_TERMS).values === undefined &&
    ALL_STATUSES.some((status) => !statuses.includes(status));
  return unwritable ? writeEnumTerms(`(${query.trim()})`, STATUS_TERMS, statuses) : written;
};
