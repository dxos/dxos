//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import '@dxosTheme';

import { Avatar, Pulse } from '@dxos/react-components';

import { HaloRing } from '../../components/HaloRing';
import { Button } from './Button';
import { CloseButton } from './CloseButton';
import { Content } from './Content';
import { Heading } from './Heading';
import { Input } from './Input';
import { Maxie, MaxieItem } from './Maxie';
import { Panel } from './Panel';
import { Title } from './Title';
import { Actions } from './Actions';

export default {
  component: Panel,
  actions: { argTypesRegex: '^on.*' }
};

export const Default = (props: any) => {
  return (
    <Panel {...props} className='min-is-[260px] max-is-[320px]' title='Panel title that is long'>
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

export const WithMaxie = (props: any) => {
  const [state, setState] = useState(0);
  return (
    <Panel {...props} title='Panel with maxie' className='min-is-[260px] max-is-[320px]'>
      <Maxie>
        <MaxieItem active={state === 0}>
          <Content>
            <Heading>Heyoo</Heading>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            <Actions>
              <Button onClick={() => setState(1)}>Proceed</Button>
              <Button variant='ghost'>Cancel</Button>
            </Actions>
          </Content>
        </MaxieItem>
        <MaxieItem active={state === 1}>
          <Content>
            <Heading>Heyoo 2</Heading>
            Aenean id maximus enim, id tempor sem. Curabitur sapien justo, pulvinar mattis lobortis non, blandit at
            nisi. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean id maximus enim, id tempor sem.
            Curabitur sapien justo, pulvinar mattis lobortis non, blandit at nisi.
            <Actions>
              <Button onClick={() => setState(0)}>Proceed 2 </Button>
              <Button variant='ghost'>Cancel</Button>
            </Actions>
          </Content>
        </MaxieItem>
      </Maxie>
    </Panel>
  );
};

export const JoiningPanel = (props: any) => {
  return (
    <Panel {...props} className='min-is-[260px] max-is-[320px]'>
      <Title>Joining space</Title>
      <CloseButton />
      <Content className='text-center'>
        <HaloRing>
          <Pulse />
        </HaloRing>
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

export const InputPanel = (props: any) => {
  return (
    <Panel {...props} className='min-is-[260px] max-is-[320px]'>
      <Title>Creating identity</Title>
      <CloseButton />
      <Content className='text-center'>
        <HaloRing>
          <Pulse />
        </HaloRing>
      </Content>
      <Content>
        <Input slots={{ input: { className: 'text-center' } }} label={<Heading>Enter a display name</Heading>} />
        <Button>Continue</Button>
        <Button variant='ghost'>Back</Button>
      </Content>
    </Panel>
  );
};

export const Welcome = (props: any) => {
  return (
    <Panel {...props} className='min-is-[260px] max-is-[320px]'>
      <Title></Title>
      <CloseButton />
      <Content className='text-center'>
        <HaloRing>
          <Avatar labelId='' fallbackValue={'cafebabe'} />
        </HaloRing>
      </Content>
      <Content>
        <Heading>Welcome, User</Heading>
        <Button>Dismiss</Button>
        <Button variant='ghost'>Back</Button>
      </Content>
    </Panel>
  );
};
