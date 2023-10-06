//
// Copyright 2023 DXOS.org
//

import { DeepSignal } from 'deepsignal';
import { Context, createContext, useContext } from 'react';

import { CopyTileAction, Delegator, MosaicChangeHandler, MosaicState } from '../types';

export type MosaicContextValue = {
  getData: (dndId: string) => any;
  mosaic: DeepSignal<MosaicState>;
  onMosaicChange?: MosaicChangeHandler;
  copyTile: CopyTileAction;
  Delegator: Delegator;
};

const defaultMosaicContextValue: MosaicContextValue = {
  getData: () => ({}),
  mosaic: { tiles: {}, relations: {} },
  onMosaicChange: () => {},
  copyTile: () => ({
    id: 'never',
    index: 'a0',
    variant: 'card',
  }),
  Delegator: () => null,
};

export const MosaicContext: Context<MosaicContextValue> = createContext<MosaicContextValue>(defaultMosaicContextValue);

export const useMosaic = () => useContext(MosaicContext);
