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
      <Panel title='Hello'>
        <Content>
          <Heading>You have been warned</Heading>
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
