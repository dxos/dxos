//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Card } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { ObjectArticle } from './ObjectArticle';
import { Header } from '../Header';

// Stub toolbar / header / body slots to show the shared article scaffold (Panel → toolbar · header · body).
const DefaultStory = () => (
  <ObjectArticle
    role='article'
    toolbar={<div className='flex items-center px-2 text-sm text-description'>Toolbar</div>}
    header={
      <Header.Root>
        <Card.Row>
          <Card.Text classNames='text-lg'>Article header</Card.Text>
        </Card.Row>
      </Header.Root>
    }
  >
    <div className='p-3 text-description'>Article body content.</div>
  </ObjectArticle>
);

const meta = {
  title: 'plugins/plugin-inbox/components/ObjectArticle',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
