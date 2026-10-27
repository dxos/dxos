//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import * as AlertDialog from '@dxos/react-ui/AlertDialog';
import * as Button from '@dxos/react-ui/Button';
import { withTheme } from '@dxos/react-ui/testing';
import * as Typography from '@dxos/react-ui/Typography';

import { Viewport, useViewportContext } from './Viewport.tsx';

type StorybookViewportProps = {};

const VIEWS = ['one', 'two', 'three'];

const Views = () => {
  const { setActiveView } = useViewportContext('StorybookViews');
  return (
    <Viewport.Views>
      {VIEWS.map((id, index) => (
        <Viewport.View key={id} id={id}>
          <AlertDialog.Body>
            <Typography.Text>{id}</Typography.Text>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button.Root onClick={() => setActiveView(VIEWS[(index + 1) % VIEWS.length])}>Next</Button.Root>
          </AlertDialog.Footer>
        </Viewport.View>
      ))}
    </Viewport.Views>
  );
};

const StorybookViewport = (_: StorybookViewportProps) => {
  return (
    <AlertDialog.Root defaultOpen>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Viewport</AlertDialog.Title>
        </AlertDialog.Header>
        <AlertDialog.Description srOnly>Storybook viewport navigation demo.</AlertDialog.Description>
        <Viewport.Root defaultActiveView='one'>
          <Views />
        </Viewport.Root>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
};

const meta = {
  title: 'sdk/shell/StorybookViewport',
  component: StorybookViewport,
  decorators: [withTheme()],
} satisfies Meta<typeof StorybookViewport>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
