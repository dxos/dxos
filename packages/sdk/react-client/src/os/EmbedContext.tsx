//
// Copyright 2023 DXOS.org
//

import React, { createContext, FC, PropsWithChildren, useContext, useReducer } from 'react';

import { humanize } from '@dxos/util';

import { useClient } from '../client';
import { useSpaces, useSpaceSetter } from '../echo';

export type Layout = 'hidden' | 'left';
export type Panel = 'left';

export type EmbedState = {
  layout: Layout;
};

export type ActionType = 'set-layout';

export type EmbedAction = { type: 'set-layout'; layout: Layout };

export type EmbedContextProps = {
  state: EmbedState;
  dispatch: (action: EmbedAction) => void;
};

const reducer = (state: EmbedState, action: EmbedAction) => {
  switch (action.type) {
    case 'set-layout':
      return {
        ...state,
        layout: action.layout
      };

    default:
      return state;
  }
};

const initialState: EmbedState = {
  layout: 'hidden'
};

export const EmbedContext = createContext<EmbedContextProps>({ state: initialState, dispatch: () => {} });

export const useEmbed = () => useContext(EmbedContext);

const getPanelClassList = (layout: Layout, panel: Panel) => {
  if (layout === 'left' && panel === 'left') {
    return '';
  } else {
    return '__DXOS_EMBED_HIDDEN';
  }
};

export const EmbedProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const client = useClient();
  const setSpace = useSpaceSetter();
  const spaces = useSpaces();

  return (
    <EmbedContext.Provider value={{ state, dispatch }}>
      {children}
      {/* TODO(wittjosiah): Embed iframe. */}
      <div id='__DXOS_LEFT_PANEL' className={getPanelClassList(state.layout, 'left')}>
        <div className='flex'>
          <h2>Spaces</h2>
          <div className='flex-grow'></div>
          <button id='add' onClick={() => client.echo.createSpace()}>
            +
          </button>
          <button id='close' onClick={() => dispatch({ type: 'set-layout', layout: 'hidden' })}>
            ❯
          </button>
        </div>
        <ul>
          {spaces.map((space) => {
            const key = space.key.toHex();
            return (
              <li key={key} onClick={() => setSpace(space)}>
                {humanize(key)}
              </li>
            );
          })}
        </ul>
      </div>
    </EmbedContext.Provider>
  );
};
