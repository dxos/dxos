//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { TranslationsContext } from '../primitives/index.ts';

export const useTranslationsContext = () => useContext(TranslationsContext);
