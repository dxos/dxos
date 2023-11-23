//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { MosaicContainerContext, type MosaicContainerContextType } from '../Container';
import { type MosaicDataItem } from '../types';

export const useContainer = <
  TData extends MosaicDataItem = MosaicDataItem,
  TPosition = unknown,
>(): MosaicContainerContextType<TData, TPosition> => useContext(MosaicContainerContext);
