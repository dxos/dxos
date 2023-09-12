//
// Copyright 2023 DXOS.org
//

import React, { createContext, useContext } from 'react';

import { DndProvider } from '../dnd';
import { Tile } from '../tile';
import type { Mosaic } from '../types';

type MosaicProps = {
  mosaic: Mosaic;
  root: string;
};

const defaultMosaicContextValue: MosaicProps = {
  mosaic: { items: {}, relations: {} },
  root: '',
};

const MosaicContext = createContext<MosaicProps>(defaultMosaicContextValue);

const useMosaic = () => useContext(MosaicContext).mosaic;

const Mosaic = (props: MosaicProps) => {
  return (
    <DndProvider>
      <MosaicContext.Provider value={props}>
        <Tile tile={props.mosaic.items[props.root]} />
      </MosaicContext.Provider>
    </DndProvider>
  );
};

export { Mosaic, useMosaic };

export type { MosaicProps };
