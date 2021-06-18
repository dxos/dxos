//
// Copyright 2020 DXOS.org
//

import { useContext } from 'react';

import { AppKitContext } from './context';

export const useKeywords = () => {
  const { keywords = [] } = useContext(AppKitContext);
  return keywords;
};
