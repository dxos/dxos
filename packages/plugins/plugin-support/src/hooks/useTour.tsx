//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { Tour } from '#types';

export const useTour = () => {
  return useContext(Tour.Context) ?? raise(new Error('Missing Tour.Context'));
};
