//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { alice } from '../../testing/fixtures';

import { SpaceMemberListImpl } from './SpaceMemberList';

const meta = {
  title: 'sdk/shell/SpaceMemberList',
  component: SpaceMemberListImpl,
  decorators: [withTheme],
} satisfies Meta<typeof SpaceMemberListImpl>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = (props: any) => <SpaceMemberListImpl {...props} members={[alice]} />;
