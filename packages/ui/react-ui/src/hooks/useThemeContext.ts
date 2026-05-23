//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { ThemeContext } from '../primitives';

export const useThemeContext = () => useContext(ThemeContext) ?? raise(new Error('Missing ThemeContext'));
