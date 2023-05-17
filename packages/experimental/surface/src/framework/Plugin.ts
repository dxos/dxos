//
// Copyright 2023 DXOS.org
//

import { FC, PropsWithChildren } from 'react';

export interface Plugin {
  meta: {
    id: string;
  };
  provides: {
    context?: FC<PropsWithChildren>;
    component?: <P extends PropsWithChildren = PropsWithChildren>(datum: any, props?: Partial<P>) => FC<P>;
    components?: Record<string, FC>;
  };
}

export const definePlugin = (plugin: Plugin) => {
  return plugin;
};
