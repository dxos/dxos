//
// Copyright 2022 DXOS.org
//

import { useFocus } from 'ink';
import React, { FC, ReactNode, createContext, useContext, useState, useEffect } from 'react';

type ModuleState = string

const ModuleContext = createContext<[ModuleState, (state: ModuleState) => void] | undefined>(undefined);

export const ModuleProvider: FC<{
  children: ReactNode
  root: string
}> = ({
  children,
  root
}) => {
  const { focus } = useFocus({ isActive: false });
  const [path, setPath] = useState<ModuleState>();
  useEffect(() => {
    if (!path) {
      focus(root);
    }
  }, [path]);

  return (
    <ModuleContext.Provider value={[root, setPath]}>
      {children}
    </ModuleContext.Provider>
  );
};

export const useModule = () => {
  return useContext(ModuleContext)!;
};
