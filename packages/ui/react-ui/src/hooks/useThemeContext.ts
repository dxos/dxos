//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

// TODO(burdon): !!!
import { ThemeContext } from '../components/ThemeProvider/ThemeProvider';

export const useThemeContext = () => {
  console.log('??', (ThemeContext as any).__id);
  return useContext(ThemeContext) ?? raise(new Error('Missing ThemeContext'));
};
