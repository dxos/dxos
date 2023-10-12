//
// Copyright 2023 DXOS.org
//

import { Context, createContext, useContext } from 'react';

export type MosaicRootContextValue = {
  id: string;
};

const defaultMosaicRootContextValue: MosaicRootContextValue = {
  id: 'never',
};

export const MosaicRootContext: Context<MosaicRootContextValue> =
  createContext<MosaicRootContextValue>(defaultMosaicRootContextValue);

export const useMosaicRoot = () => useContext(MosaicRootContext);
