//
// Copyright 2022 DXOS.org
//

import { useFocus } from 'ink';
import React, { FC, ReactNode, createContext, useContext, useState, useEffect } from 'react';

const ModuleContext = createContext<[string | undefined, (value: string) => void] | undefined>(undefined);

export const ModuleProvider: FC<{
  children: ReactNode
  value: string
}> = ({
  children,
  value: initialValue
}) => {
  const { focus } = useFocus({ isActive: false });
  const [value, setValue] = useState<string | undefined>();
  useEffect(() => {
    if (!value) {
      focus(initialValue);
    }
  }, [value]);

  return (
    <ModuleContext.Provider value={[value, setValue]}>
      {children}
    </ModuleContext.Provider>
  );
};

export const useModule = () => {
  return useContext(ModuleContext)!;
};
