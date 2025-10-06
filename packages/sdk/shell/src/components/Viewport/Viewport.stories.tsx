//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { AlertDialog } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { Action } from '../Panel';

import { Viewport, type ViewportScopedProps, useViewportContext } from './Viewport';

type StorybookViewportProps = {};

const Views = ({ __viewportScope }: ViewportScopedProps<{}>) => {
  const { setActiveView } = useViewportContext('StorybookViews', __viewportScope);
  return (
    <Viewport.Views>
      <Viewport.View id='one' classNames='p-4'>
        <p>One</p>
        <p className='invisible'>Two</p>
        <p className='invisible'>Three</p>
        <Action onClick={() => setActiveView('two')}>Next</Action>
      </Viewport.View>
      <Viewport.View id='two' classNames='p-4'>
        <p className='invisible'>One</p>
        <p>Two</p>
        <p className='invisible'>Three</p>
        <Action onClick={() => setActiveView('three')}>Next</Action>
      </Viewport.View>
      <Viewport.View id='three' classNames='p-4'>
        <p className='invisible'>One</p>
        <p className='invisible'>Two</p>
        <p>Three</p>
        <Action onClick={() => setActiveView('one')}>Next</Action>
      </Viewport.View>
    </Viewport.Views>
  );
};

const StorybookViewport = (props: StorybookViewportProps) => {
  return (
    <AlertDialog.Root defaultOpen>
      <AlertDialog.Overlay>
        <AlertDialog.Content classNames='p-0'>
          <Viewport.Root defaultActiveView='one'>
            <Views />
          </Viewport.Root>
        </AlertDialog.Content>
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};

const meta = {
  title: 'sdk/shell/StorybookViewport',
  component: StorybookViewport,
  decorators: [withTheme],
} satisfies Meta<typeof StorybookViewport>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
