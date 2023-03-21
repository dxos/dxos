//
// Copyright 2023 DXOS.org
//

import { Info, Sliders } from '@phosphor-icons/react';
import React, { FC } from 'react';

export const ConfigPage = React.lazy(() => import('../routes/Config'));
export const StatusPage = React.lazy(() => import('../routes/Status'));

export type Module = {
  id: string;
  label: string;
  Icon: FC<any>;
  Component: FC<any>;
};

export const useModules = (): Module[] => {
  return [
    {
      id: 'config',
      label: 'Config',
      Icon: Sliders,
      Component: ConfigPage
    },
    {
      id: 'status',
      label: 'Status',
      Icon: Info,
      Component: StatusPage
    }
  ];
};
