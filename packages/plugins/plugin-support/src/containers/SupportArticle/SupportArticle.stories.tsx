//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Support } from '#types';

import { SupportArticle } from './SupportArticle';

type StoryArgs = {
  title?: string;
  body?: string;
  status?: Support.TicketStatus;
  resolution?: string;
};

const DefaultStory = ({ title, body, status, resolution }: StoryArgs) => {
  const ticket = useMemo(() => {
    const next = Support.make({ title, body });
    if (status || resolution) {
      Obj.update(next, (next) => {
        const mutable = next as Obj.Mutable<typeof next>;
        if (status) {
          mutable.status = status;
        }
        if (resolution) {
          mutable.resolution = resolution;
        }
      });
    }
    return next;
  }, [title, body, status, resolution]);

  return <SupportArticle role='article' attendableId='story' subject={ticket} />;
};

const meta = {
  title: 'plugins/plugin-support/containers/SupportArticle',
  component: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen', classNames: 'dx-document' }),
    withClientProvider({ createIdentity: true }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Echo sync hangs after reload',
    body: 'After refreshing the page my data sometimes takes 30s to reappear.',
  },
};

export const Resolved: Story = {
  args: {
    title: 'Composer crashes on large markdown',
    body: 'Pasting >100kb of markdown into a document used to hang the app.',
    status: 'resolved',
    resolution: 'Fixed in v0.8.4 by chunking the parser.',
  },
};
