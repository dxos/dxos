//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { TranslationsContext } from '../components/UiProvider/TranslationsProvider';

export const useTranslationsContext = () => useContext(TranslationsContext);
