//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { ThemeContext } from '../components';

export const useTranslationsContext = () => useContext(ThemeContext);
