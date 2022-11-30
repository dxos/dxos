//
// Copyright 2022 DXOS.org
//

export const LIST_TYPE = 'todomvc:list';
export const TODO_TYPE = 'todomvc:todo';

export const ALL_TODOS = 'all';
export const ACTIVE_TODOS = 'active';
export const COMPLETED_TODOS = 'completed';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}
