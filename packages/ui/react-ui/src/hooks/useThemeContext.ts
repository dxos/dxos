//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

// TODO(burdon): !!!
import { ThemeContext } from '../components/ThemeProvider/ThemeProvider';

const map: any = {};

export const useThemeContext = () => {
  if (!map[(ThemeContext as any).__id!]) {
    map[(ThemeContext as any).__id!] = true;
    // TODO(burdon): Called multiple times with empty context.
    console.log('??', (ThemeContext as any).__id);
  }

  return useContext(ThemeContext) ?? raise(new Error('Missing ThemeContext'));
};
