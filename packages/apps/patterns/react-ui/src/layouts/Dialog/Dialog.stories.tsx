//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { Dialog } from './Dialog';
import { Panel, Title, Heading, Content, Button, CloseButton } from '../../panels/Panel';

export default {
  component: Dialog,
  actions: { argTypesRegex: '^on.*' }
};

export const Default = (props: any) => {
  return (
    <Dialog {...props}>
      <Panel>
        <Title>Hello</Title>
        <CloseButton />
        <Heading>You have been warned</Heading>
        <Content>
          <Button>OK</Button>
        </Content>
      </Panel>
    </Dialog>
  );
};
