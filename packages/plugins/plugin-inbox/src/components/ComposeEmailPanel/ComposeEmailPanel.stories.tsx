//
// Copyright 2025 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { withTheme } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { translations } from '../../translations';

import { ComposeEmailPanel } from './ComposeEmailPanel';

const createInMemoryDraft = () =>
  Obj.make(Message.Message, {
    created: new Date().toISOString(),
    sender: { name: 'Me' },
    blocks: [{ _tag: 'text' as const, text: '' }],
    properties: {
      to: '',
      subject: '',
    },
  });

const DefaultStory = () => {
  const draft = useMemo(createInMemoryDraft, []);
  return <ComposeEmailPanel draft={draft} onSend={async (message) => console.log(message)} />;
};

const meta = {
  title: 'plugins/plugin-inbox/ComposeEmailPanel',
  component: ComposeEmailPanel,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof ComposeEmailPanel>;

export default meta;

export const Default = {};
