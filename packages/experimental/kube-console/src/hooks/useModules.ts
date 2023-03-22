//
// Copyright 2023 DXOS.org
//

import { Info, Sliders } from '@phosphor-icons/react';
import { FC } from 'react';

import { ConfigPage, StatusPage } from '../routes';

export type Module = {
  id: string;
  label: string;
  Icon: FC<any>;
  Component: FC<any>; // TODO(burdon): ???
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
      label: 'Status a;sldkjfa ;lsdfjklkasjdf lkasjdflaksjdf lskdj ',
      Icon: Info,
      Component: StatusPage
    }
  ];
};
