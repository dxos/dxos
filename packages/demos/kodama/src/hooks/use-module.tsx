//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode, createContext, useContext, useState, useEffect } from 'react';

const ModuleContext = createContext<[string | undefined, (value: string) => void] | undefined>(undefined);

export const ModuleProvider: FC<{
  children: ReactNode
  value?: string
}> = ({
  children,
  value: initialValue
}) => {
  const [value, setValue] = useState<string | undefined>(initialValue);
  useEffect(() => {}, [value]);

  return (
    <ModuleContext.Provider value={[value, setValue]}>
      {children}
    </ModuleContext.Provider>
  );
};

export const useModule = () => {
  return useContext(ModuleContext)!;
};
