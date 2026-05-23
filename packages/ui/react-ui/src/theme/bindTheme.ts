//
// Copyright 2023 DXOS.org
//

import { type ClassNameArray, type ComponentFunction, type Theme, type ThemeFunction } from '@dxos/ui-types';
import { getDeep } from '@dxos/util';

export const bindTheme = <P extends Record<string, any>>(theme: Theme<Record<string, any>>): ThemeFunction<P> => {
  return (path: string, styleProps?: P, ...etc: ClassNameArray) => {
    const result = getDeep<Theme<P> | ComponentFunction<P>>(theme, path.split('.'));
    return typeof result === 'function' ? result(styleProps ?? ({} as P), ...etc) : undefined;
  };
};
