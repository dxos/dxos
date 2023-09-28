//
// Copyright 2023 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { MosaicContextValue } from '../../types';

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
