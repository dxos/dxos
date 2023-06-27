//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/react-surface';

import { TranslationsProvides } from './types';

type TranslationsPlugin = Plugin<TranslationsProvides>;
export const translationsPlugins = (plugins: Plugin[]): TranslationsPlugin[] => {
  return (plugins as TranslationsPlugin[]).filter((p) => Array.isArray(p.provides?.translations));
};
