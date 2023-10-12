//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { MosaicContainerContext, MosaicContainerProps } from '../Container';
import { MosaicDataItem } from '../types';

export const useContainer = <
  TData extends MosaicDataItem = MosaicDataItem,
  TPosition = unknown,
  TCustom = any,
>(): MosaicContainerProps<TData, TPosition, TCustom> =>
  useContext(MosaicContainerContext) ?? raise(new Error('Missing MosaicContainerContext'));
