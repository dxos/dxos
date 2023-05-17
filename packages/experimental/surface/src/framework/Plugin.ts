//
// Copyright 2023 DXOS.org
//

import { FC, PropsWithChildren } from 'react';

export interface Plugin<TProvides = {}> {
  meta: {
    id: string;
  };
  provides: {
    context?: FC<PropsWithChildren>;
    component?: <P extends PropsWithChildren = PropsWithChildren>(datum: any, props?: Partial<P>) => FC<P>;
    components?: Record<string, FC>;
  } & TProvides;
}

export const definePlugin = (plugin: Plugin) => {
  return plugin;
};
