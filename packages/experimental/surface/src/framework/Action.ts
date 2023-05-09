//
// Copyright 2023 DXOS.org
//

export type Action = {
  type: string;
};

export const NullAction: Action = { type: 'null' };

// TODO(burdon): Why Context?
export type ActionHandlers<TState, TAction extends Action, TContext = any> = {
  [type in TAction['type']]: (state: TState, action: Extract<TAction, { type: type }>, context: TContext) => TState;
};

export const createActionReducer =
  <TState, TAction extends Action>(handlers: Partial<ActionHandlers<TState, TAction>>) =>
  (state: TState, action: TAction): TState => {
    if (action.type in handlers) {
      return handlers[action.type as keyof typeof handlers]?.(state, action as any, {}) ?? state;
    } else {
      return state;
    }
  };
