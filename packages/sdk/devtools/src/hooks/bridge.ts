//
// Copyright 2020 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { Context } from '../Provider';
import { DevtoolsBridge } from '../bridge';

export const useBridge = (): [DevtoolsBridge] => {
  const { bridge } = useContext(Context) ?? raise(new Error('Devtools context not set'));
  return [bridge];
};
