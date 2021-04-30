//
// Copyright 2020 DXOS.org
//

import { useContext } from 'react';

import { raise } from '../util';
import { ClientContext } from './context';

export const useConfig = () => {
  const { config } = useContext(ClientContext) ?? raise(new Error('`useConfig` hook is called outside of ClientContext. Wrap the component with `ClientProvider` or `ClientInitializer`'));
  return config;
};
