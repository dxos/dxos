//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { MosaicContext } from '../Root';

export const useMosaic = () => {
  // NOTE: Omit `containers`, for internal use only.
  const { setContainer, activeItem, overItem } = useContext(MosaicContext) ?? raise(new Error('Missing MosaicContext'));

  return { setContainer, activeItem, overItem };
};
