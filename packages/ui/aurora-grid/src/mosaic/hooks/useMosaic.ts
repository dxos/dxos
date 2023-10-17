//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { MosaicContext } from '../Root';

export const useMosaic = () => useContext(MosaicContext) ?? raise(new Error('Missing MosaicContext'));
