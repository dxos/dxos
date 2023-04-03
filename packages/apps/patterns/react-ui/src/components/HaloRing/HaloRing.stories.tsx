//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { Avatar } from '@dxos/react-components';

import { InvitationEmoji } from '../InvitationEmoji';
import { HaloRing } from './HaloRing';
import { Panel, Content } from '../../panels/Panel';

export default {
  component: HaloRing,
  actions: { argTypesRegex: '^on.*' }
};

export const Loading = (props: any) => {
  return <HaloRing {...props} loading />;
};

export const Normal = (props: any) => {
  return <HaloRing {...props} />;
};

const random = '20970b563fc49b5bb194a6ffdff376031a3a11f9481360c071c3fed87874106b';

export const WithAvatar = (props: any) => {
  return (
    <HaloRing {...props}>
      <Avatar fallbackValue={random} label='Os Mutantes' />
    </HaloRing>
  );
};

export const WithAvatarActive = (props: any) => {
  return (
    <HaloRing {...props} status='active'>
      <Avatar fallbackValue={random} label='Os Mutantes' />
    </HaloRing>
  );
};

export const WithAvatarInactive = (props: any) => {
  return (
    <HaloRing {...props} status='inactive'>
      <Avatar fallbackValue={random} label='Os Mutantes' />
    </HaloRing>
  );
};

export const WithJoinEmoji = (props: any) => {
  return (
    <div className='flex gap-2 flex-wrap'>
      {new Array(256).fill(0).map((_x, i) => (
        <HaloRing key={i} {...props}>
          <InvitationEmoji invitationId={(i + 1).toString()} />
        </HaloRing>
      ))}{' '}
    </div>
  );
};

export const OnAPanel = (props: any) => {
  return (
    <Panel className='max-is-[320px]'>
      <Content className='text-center'>
        <HaloRing {...props} loading />
        <HaloRing {...props} />
      </Content>
    </Panel>
  );
};

export const OnAPanelWithAvatars = (props: any) => {
  return (
    <Panel className='max-is-[320px]'>
      <Content>
        <HaloRing {...props}>
          <Avatar fallbackValue={random} label='Os Mutantes' />
        </HaloRing>
        <HaloRing {...props} status='active'>
          <Avatar fallbackValue={random} label='Os Mutantes' />
        </HaloRing>
        <HaloRing {...props} status='inactive'>
          <Avatar fallbackValue={random} label='Os Mutantes' />
        </HaloRing>
      </Content>
    </Panel>
  );
};
