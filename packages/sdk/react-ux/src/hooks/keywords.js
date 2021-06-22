//
// Copyright 2020 DXOS.org
//

import { useContext } from 'react';

import { ReactUXContext } from './context';

export const useKeywords = () => {
  const { keywords = [] } = useContext(ReactUXContext);
  return keywords;
};
