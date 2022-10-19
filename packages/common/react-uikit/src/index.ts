//
// Copyright 2022 DXOS.org
//

import type { TFunction as NaturalTFunction } from 'react-i18next';

export { useTranslation } from 'react-i18next';

export type TFunction = NaturalTFunction;
export type TKey = Parameters<TFunction>;

export * from './components';
