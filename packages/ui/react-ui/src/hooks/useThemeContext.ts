//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { ThemeContext } from '../components';

export const useThemeContext = () => useContext(ThemeContext) ?? raise(new Error('Missing ThemeContext'));
