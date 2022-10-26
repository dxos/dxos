//
// Copyright 2022 DXOS.org
//

import { useFocus } from 'ink';
import React, { FC, ReactNode, createContext, useContext, useMemo, useState, useEffect } from 'react';

// Currently active path.
type ModuleState = string;

type Context = [
  ModuleState,
  (state: ModuleState) => void,
  // Currently rendered modules.
  Set<string>
];

const ModuleContext = createContext<Context | undefined>(undefined);

export const ModuleProvider: FC<{
  children: ReactNode;
  root: string;
}> = ({ children, root }) => {
  const { focus } = useFocus({ isActive: false });
  const [path, setPath] = useState<ModuleState>();
  const modules = useMemo(() => new Set<string>(), []);
  useEffect(() => {
    focus(path ?? root);
  }, [path]);

  return <ModuleContext.Provider value={[path ?? root, setPath, modules]}>{children}</ModuleContext.Provider>;
};

export const useModule = (): Context => {
  const [path, setPath, modules] = useContext(ModuleContext)!;
  return [path, setPath, modules];
};
