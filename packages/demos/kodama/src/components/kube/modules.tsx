//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { MenuItem, Module, Panel } from '../util';
import { KubeStatus } from './KubeStatus';

export const createKubeMenu = (): MenuItem => {
  return {
    id: 'kube',
    label: 'KUBE',
    component: ({ parent }) => {
      return (
        <Module
          id='kube'
          parent={parent}
          items={[
            {
              id: 'status',
              label: 'Status',
              component: () => (
                <Panel>
                  <KubeStatus />
                </Panel>
              )
            }
          ]}
        />
      );
    }
  };
};
