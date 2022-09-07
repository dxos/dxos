//
// Copyright 2022 DXOS.org
//

import { Text } from 'ink';
import React from 'react';

import { MenuItem, Module, Panel } from '../util';

export const createMeshMenu = (): MenuItem => {
  return {
    id: 'mesh',
    label: 'MESH',
    component: ({ parent }) => {
      return (
        <Module
          id='mesh'
          parent={parent}
          items={[
            {
              id: 'info',
              label: 'Info',
              component: () => (
                <Panel>
                  <Text>MESH</Text>
                </Panel>
              )
            }
          ]}
        />
      );
    }
  };
};
