//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';


import { alice } from '../../testing/fixtures';

import { SpaceMemberListImpl } from './SpaceMemberList';

const meta = {
  title: 'sdk/shell/SpaceMemberList',
  component: SpaceMemberListImpl,
    parameters: { chromatic: { disableSnapshot: false } },
} satisfies Meta<typeof SpaceMemberListImpl>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = (props: any) => {
  return <SpaceMemberListImpl {...props} members={[alice]} />;
};
