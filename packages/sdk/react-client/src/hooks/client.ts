//
// Copyright 2020 DXOS.org
//

import { useContext } from 'react';

import { raise } from '../util';
import { ClientContext } from './context';

export const useClient = () => {
  const client = useContext(ClientContext) ?? raise(new Error('`useClient` hook is called outside of ClientContext. Wrap the component with `ClientProvider` or `ClientInitializer`'));
  return client;
};
