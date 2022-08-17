//
// Copyright 2022 DXOS.org
//

import { createContext, Dispatch, ReactNode, useContext, useReducer } from 'react';

import { PublicKey } from '@dxos/protocols';

// TODO(wittjosiah): Just use strings?
export enum ActionType {
  RESET,
  HALO_SHARING,
  PARTY_SHARING,
  PARTY_JOIN,
  NOTIFICATION,
  DANGEROUSLY_RESET_STORAGE,
}

export type PartySharingParams = {
  partyKey: PublicKey
}

export type NotificationParams = {
  message: string
  duration?: number
  action?: ReactNode
}

export type ResetParams = {
  now?: boolean
}

export type AppAction =
  | { type: ActionType.RESET }
  | { type: ActionType.HALO_SHARING }
  | { type: ActionType.PARTY_SHARING, params: PartySharingParams }
  | { type: ActionType.PARTY_JOIN }
  | { type: ActionType.NOTIFICATION, params: NotificationParams }
  | { type: ActionType.DANGEROUSLY_RESET_STORAGE, params?: ResetParams }

const initialState = undefined;

const reducer = (state: AppAction | undefined, action: AppAction) => {
  if (action.type === ActionType.RESET) {
    return initialState;
  }

  return action;
};

export const createActionContext = () => useReducer(reducer, initialState);

export const ActionContext = createContext<[AppAction | undefined, Dispatch<AppAction>]>([undefined, () => {}]);

/**
 * Provides current app action and dispatcher.
 */
export const useActions = () => useContext(ActionContext);
