//
// Copyright 2023 DXOS.org
//

type MaybePromise<T> = T | Promise<T>;

export type Effect<TState = any> = () => MaybePromise<(state: TState) => TState>;

export type Action = {
  type: string;
};

export type ReducerResult<TState> = { state?: TState; effects?: Effect[] } | undefined;

export type Reducer<TState, TAction> = (action: TAction, state: TState) => ReducerResult<TState>;

export type DispatchFunction<TAction> = (...actions: TAction[]) => ReducerResult<TState>;

export type ActionHandlers<TState, TAction extends Action> = {
  [type in TAction['type']]: Reducer<TState, Extract<TAction, { type: type }>>;
};

export const createActionReducer =
  <TState, TAction extends Action>(handlers: Partial<ActionHandlers<TState, TAction>>) =>
  (action: TAction | TAction[], state: TState): ReducerResult<TState> => {
    const actions = Array.isArray(action) ? action : [action];
    for (const action of actions) {
      if (action.type in handlers) {
        return handlers[action.type as keyof typeof handlers]?.(action as any, state);
      }
    }
  };
