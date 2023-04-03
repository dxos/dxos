//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';

import { Button } from './Button';
import { CloseButton } from './CloseButton';
import { Content } from './Content';
import { Heading } from './Heading';
import { Panel } from './Panel';
import { Title } from './Title';
import { HelpButton } from './HelpButton';
import { HelpContent } from './HelpContent';
import { Pulse } from '@dxos/react-components';

export default {
  component: Panel,
  actions: { argTypesRegex: '^on.*' }
};

export const Default = (props: any) => {
  return (
    <Panel {...props} className='min-is-[260px] max-is-[320px]'>
      <Title>Panel title</Title>
      <CloseButton />
      <Content>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean id maximus enim, id tempor sem. Curabitur sapien
        justo, pulvinar mattis lobortis non, blandit at nisi.
      </Content>
      <Heading>Choose an option to continue</Heading>
      <Content>
        <Button>Proceed</Button>
        <Button variant='ghost'>Cancel</Button>
      </Content>
    </Panel>
  );
};

export const Joining = (props: any) => {
  return (
    <Panel {...props} className='min-is-[260px] max-is-[320px]'>
      <Title>Joining space</Title>
      <CloseButton />
      <Content>
        <Pulse />
      </Content>
      <Heading>Choose an option to continue</Heading>
      <Content>
        <Button>New identity</Button>
        <Button>Join device</Button>
        <Button>Recover identity</Button>
      </Content>
    </Panel>
  );
};
