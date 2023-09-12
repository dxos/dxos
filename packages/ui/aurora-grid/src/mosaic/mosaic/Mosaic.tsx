//
// Copyright 2023 DXOS.org
//

import React, { createContext, useContext } from 'react';

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
  console.log('[mosaic]', props);
  return (
    <MosaicContext.Provider value={props}>
      <Tile tile={props.mosaic.items[props.root]} />
    </MosaicContext.Provider>
  );
};

export { Mosaic, useMosaic };

export type { MosaicProps };
