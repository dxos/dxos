//
// Copyright 2023 DXOS.org
//

import React, { createContext, useContext } from 'react';

import { DndProvider } from '../dnd';
import { Tile } from '../tile';
import type { MosaicContextValue, MosaicProps } from '../types';

const defaultMosaicContextValue: MosaicContextValue = {
  mosaic: { tiles: {}, relations: {} },
  data: {},
  Delegator: () => null,
  onMosaicChange: () => {},
};

const MosaicContext = createContext<MosaicContextValue>(defaultMosaicContextValue);

const useMosaic = () => useContext(MosaicContext);

const Mosaic = ({ mosaic, root, data, Delegator, onMosaicChange }: MosaicProps) => {
  return (
    <DndProvider>
      <MosaicContext.Provider value={{ mosaic, data, Delegator, onMosaicChange }}>
        <Tile tile={mosaic.tiles[root]} />
      </MosaicContext.Provider>
    </DndProvider>
  );
};

export { Mosaic, useMosaic };

export type { MosaicProps };
