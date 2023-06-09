//
// Copyright 2023 DXOS.org
//

import { Database, Info, Sliders } from '@phosphor-icons/react';
import { FC } from 'react';

import { ConfigPage, RegistryPage, StatusPage } from '../routes';

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
      Component: ConfigPage,
    },
    {
      id: 'status',
      label: 'Status',
      Icon: Info,
      Component: StatusPage,
    },
    {
      id: 'registry',
      label: 'Registry',
      Icon: Database,
      Component: RegistryPage,
    },
  ];
};
