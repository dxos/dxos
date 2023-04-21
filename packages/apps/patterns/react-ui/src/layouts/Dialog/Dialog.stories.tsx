//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { Panel, Heading, Content, Button, Actions } from '../../panels/Panel';
import { Dialog } from './Dialog';

export default {
  component: Dialog,
  actions: { argTypesRegex: '^on.*' }
};

export const Default = (props: any) => {
  return (
    <Dialog {...props}>
      <Panel>
        <Content>
          <Heading>You have been warned</Heading>
          <Actions>
            <Button>OK</Button>
          </Actions>
        </Content>
      </Panel>
    </Dialog>
  );
};
