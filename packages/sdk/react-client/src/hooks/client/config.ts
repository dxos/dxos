//
// Copyright 2020 DXOS.org
//

import { useContext } from 'react';

import { raise } from '../../util';
import { ClientContext } from './context';

/**
 * Hook returning config object used to initialize the DXOS client instance.
 * To be used with `ClientProvider` or `ClientInitializer` component wrapper.
 */
export const useConfig = () => {
  const { config } = useContext(ClientContext) ?? raise(new Error('`useConfig` hook is called outside of ClientContext. Wrap the component with `ClientProvider` or `ClientInitializer`'));
  return config;
};
