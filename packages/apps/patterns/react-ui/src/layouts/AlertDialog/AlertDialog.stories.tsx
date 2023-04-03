//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { Pulse } from '@dxos/react-components';

import { Panel, Title, Content, Heading, Button } from '../../panels/Panel';
import { AlertDialog } from './AlertDialog';

export default {
  component: AlertDialog,
  actions: { argTypesRegex: '^on.*' }
};

export const Default = (props: any) => {
  return (
    <AlertDialog {...props}>
      <Panel>
        <Title>Hello</Title>
        <Heading>You have been warned</Heading>
        <Content>
          <Button>OK</Button>
        </Content>
      </Panel>
    </AlertDialog>
  );
};

export const WithPulse = (props: any) => {
  return (
    <AlertDialog {...props}>
      <Panel>
        <Content>
          <Pulse />
        </Content>
      </Panel>
    </AlertDialog>
  );
};
