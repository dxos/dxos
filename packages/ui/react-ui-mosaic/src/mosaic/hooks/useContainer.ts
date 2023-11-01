//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { MosaicContainerContext, type MosaicContainerProps } from '../Container';
import { type MosaicDataItem } from '../types';

export const useContainer = <
  TData extends MosaicDataItem = MosaicDataItem,
  TPosition = unknown,
>(): MosaicContainerProps<TData, TPosition> =>
  useContext(MosaicContainerContext) ?? raise(new Error('Missing MosaicContainerContext'));
