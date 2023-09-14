//
// Copyright 2023 DXOS.org
//

import React, { createContext, PropsWithChildren, useContext } from 'react';

import { DndProvider, useDnd as useMosaicDnd } from '../dnd';
import { Tile, Stack, Card, TreeItem } from '../tile';
import type { MosaicRootContextValue, MosaicContextValue } from '../types';

const defaultMosaicContextValue: MosaicContextValue = {
  data: {},
};

const MosaicContext = createContext<MosaicContextValue>(defaultMosaicContextValue);

const useMosaicData = () => useContext(MosaicContext).data;

const MosaicProvider = ({ children, ...contextValue }: PropsWithChildren<MosaicContextValue>) => {
  return (
    <MosaicContext.Provider value={contextValue}>
      <DndProvider>{children}</DndProvider>
    </MosaicContext.Provider>
  );
};

const defaultMosaicRootContextValue: MosaicRootContextValue = {
  mosaic: { tiles: {}, relations: {} },
  Delegator: () => null,
  onMosaicChange: () => {},
};

const MosaicRootContext = createContext<MosaicRootContextValue>(defaultMosaicRootContextValue);

const useMosaic = () => useContext(MosaicRootContext);

const MosaicRoot = ({ children, ...value }: PropsWithChildren<MosaicRootContextValue>) => {
  return <MosaicRootContext.Provider value={value}>{children}</MosaicRootContext.Provider>;
};

export const Mosaic = {
  Provider: MosaicProvider,
  Root: MosaicRoot,
  Tile,
  Stack,
  Card,
  TreeItem,
};

export { useMosaic, useMosaicData, useMosaicDnd };
