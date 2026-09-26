//
// Copyright 2026 DXOS.org
//

import { type EnumProperty } from '@dxos/echo-query';
import { Task } from '@dxos/types';

/** Every status the schema offers, in the order the schema lists them. */
export const ALL_STATUSES: readonly Task.Status[] = Task.StatusOptions.map(({ id }) => id);

/**
 * The `status:` terms of a task query, as the status menu reads and writes them — so the menu and
 * the query text are two views over one string (see `parseEnumTerms`).
 */
export const STATUS_TERMS: EnumProperty<Task.Status> = { property: 'status', values: ALL_STATUSES };
