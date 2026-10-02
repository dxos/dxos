//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import * as ThemeProvider from '../providers/ThemeProvider/ThemeProvider.tsx';

export const useTranslationsContext = () => useContext(ThemeProvider.TranslationsContext);
