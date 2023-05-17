//
// Copyright 2023 DXOS.org
//

import React, { FC, PropsWithChildren } from 'react';

import { Plugin } from './Plugin';

export const compose = (contexts: FC<PropsWithChildren>[]) => {
  return contexts.reduce((Acc, Next) => ({ children }) => (
    <Next>
      <Acc>{children}</Acc>
    </Next>
  ));
};

export const composeContext = (plugins: Plugin[]) => {
  return compose(plugins.map((p) => p.provides.context!).filter(Boolean));
};
