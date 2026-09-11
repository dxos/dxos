//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { TranslationsContext } from '../providers/index.ts';

export const useTranslationsContext = () => useContext(TranslationsContext);
