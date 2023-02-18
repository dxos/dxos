//
// Copyright 2023 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { IFrameClientServicesProxy, ShellDisplay, ShellLayout } from '@dxos/client';
import { MemoryShellRuntime, ShellController } from '@dxos/client-services';
import { useClient } from '@dxos/react-client';

export type ShellContextProps = {
  runtime?: MemoryShellRuntime;
  setDisplay?: (display: ShellDisplay) => void;
};

export const ShellContext: Context<ShellContextProps> = createContext<ShellContextProps>({});

export const useShell = (): {
  setLayout: ShellController['setLayout'];
} => {
  const client = useClient();
  const { runtime, setDisplay } = useContext(ShellContext);

  const setLayout: ShellController['setLayout'] = async (layout, options) => {
    if (runtime) {
      if (layout === ShellLayout.DEFAULT) {
        setDisplay?.(ShellDisplay.NONE);
      } else {
        setDisplay?.(ShellDisplay.FULLSCREEN);
      }

      runtime.setLayout(layout, options);
    }

    if (client.services instanceof IFrameClientServicesProxy) {
      await client.services.setLayout(layout, options);
    }
  };

  return {
    setLayout
  };
};
