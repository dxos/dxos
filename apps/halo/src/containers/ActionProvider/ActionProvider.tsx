//
// Copyright 2021 DXOS.org
//

import React, { ReactNode } from 'react';

import { ActionContext, createActionContext } from '../../hooks';

interface ActionProviderProps {
  children?: ReactNode
}

export const ActionProvider = ({
  children
}: ActionProviderProps) => {
  const context = createActionContext();

  return (
    <ActionContext.Provider value={context}>
      {children}
    </ActionContext.Provider>
  );
};
