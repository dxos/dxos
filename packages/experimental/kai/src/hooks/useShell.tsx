//
// Copyright 2023 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { ShellDisplay, ShellLayout } from '@dxos/client';
import { MemoryShellRuntime, ShellRuntime } from '@dxos/client-services';

export type ShellContextProps = {
  runtime: MemoryShellRuntime;
  setDisplay: (display: ShellDisplay) => void;
};

export const ShellContext: Context<ShellContextProps> = createContext<ShellContextProps>({
  runtime: new MemoryShellRuntime(),
  setDisplay: (display: ShellDisplay) => {}
});

export const useShell = () => {
  const { runtime, setDisplay } = useContext(ShellContext);

  const setLayout: ShellRuntime['setLayout'] = (layout, options) => {
    if (layout === ShellLayout.DEFAULT) {
      setDisplay(ShellDisplay.NONE);
    } else {
      setDisplay(ShellDisplay.FULLSCREEN);
    }

    runtime.setLayout(layout, options);
  };

  return {
    setLayout
  };
};
