//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { StorybookDialog } from '../StorybookDialog';

import { Action } from './Action';
import { Actions } from './Actions';
import { Heading } from './Heading';
import { Label } from './Label';

const meta = {
  title: 'sdk/shell/StorybookDialog',
  component: StorybookDialog,
  decorators: [withTheme],
} satisfies Meta<typeof StorybookDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Normal = (props: any) => {
  return (
    <StorybookDialog {...props}>
      <Heading title='Panel heading' titleId='panel-heading'></Heading>
      <div className='p-3 text-center'>
        <Label>Lorem ipsum</Label>
        <Actions>
          <Action variant='ghost'>Ghost</Action>
          <Action>Normal</Action>
        </Actions>
      </div>
    </StorybookDialog>
  );
};

export const Primary = (props: any) => {
  return (
    <StorybookDialog {...props}>
      <Heading title='Panel heading' titleId='panel-heading'></Heading>
      <div className='p-3 text-center'>
        <Label>Lorem ipsum</Label>
        <Actions>
          <Action variant='ghost'>Ghost</Action>
          <Action variant='primary'>Primary</Action>
        </Actions>
      </div>
    </StorybookDialog>
  );
};
