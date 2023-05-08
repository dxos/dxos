//
// Copyright 2023 DXOS.org
//

export type Action = { type: string };

type NavigateAction = {
  type: 'navigate';
  spaceKey: string;
  objectId?: string;
};

type ExplodeAction = {
  type: 'explode';
};

type AnyAction = NavigateAction | ExplodeAction;

type ActionHandlers<TAction extends Action, TState, TContext = any> = {
  [type in TAction['type']]: (action: Extract<TAction, { type: type }>, state: TState, context: TContext) => TState;
};

type State = {
  location: {
    spaceKey: string;
    objectId: string | null;
  };
};

export const actions =
  <TAction extends Action, TState>(handlers: Partial<ActionHandlers<TAction, TState>>) =>
  (state: TState, action: Action) => {
    if (action.type in handlers) {
      return handlers[action.type as keyof typeof handlers]?.(action as any, state, {});
    }
  };

// ------

export const reducer = actions<AnyAction, State>({
  explode: (action, state) => state
});
