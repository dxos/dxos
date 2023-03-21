//
// Copyright 2023 DXOS.org
//

import { Info, Sliders } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { ConfigPage, StatusPage } from '../routes';

export type Module = {
  id: string;
  label: string;
  Icon: FC<any>;
  Component: FC<void>;
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
