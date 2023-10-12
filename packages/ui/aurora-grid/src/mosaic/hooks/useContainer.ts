//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { MosaicContainerContext, MosaicContainerContextType } from '../Container';

export const useContainer = (): MosaicContainerContextType =>
  useContext(MosaicContainerContext) ?? raise(new Error('Missing MosaicContainerContext'));
