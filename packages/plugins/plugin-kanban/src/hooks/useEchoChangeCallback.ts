//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { Obj } from '@dxos/echo';

import { type Kanban, type KanbanChangeCallback } from '#types';

/**
 * Creates a change callback for ECHO-backed kanban and items (plain function, no hooks).
 * Use this when the kanban and items are stored in the ECHO database.
 */
export const createEchoChangeCallback = <T extends Obj.Unknown>(kanban: Kanban.Kanban): KanbanChangeCallback<T> => ({
  kanban: (mutate) => Obj.update(kanban, (kanban) => mutate(kanban)),
  setItemField: (item, field, value) => {
    Obj.update(item, (item: any) => {
      item[field] = value;
    });
  },
});

/**
 * Returns a memoized ECHO change callback for the given kanban.
 * Returns null when kanban is undefined.
 */
export const useEchoChangeCallback = <T extends Obj.Unknown = Obj.Unknown>(
  kanban: Kanban.Kanban | undefined,
): KanbanChangeCallback<T> | null => useMemo(() => (kanban ? createEchoChangeCallback<T>(kanban) : null), [kanban]);
