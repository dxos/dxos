//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { TranslationsContext } from '../components/ThemeProvider/TranslationsProvider';

export const useTranslationsContext = () => useContext(TranslationsContext);
