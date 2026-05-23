//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { TranslationsContext } from '../primitives/ThemeProvider/TranslationsProvider';

export const useTranslationsContext = () => useContext(TranslationsContext);
