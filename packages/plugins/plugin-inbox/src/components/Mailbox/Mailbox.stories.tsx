//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';
import './mailbox.css';

import { type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Mailbox } from './Mailbox';
import { createMessages } from '../../testing';

const DefaultStory = () => {
  const [messages] = useState(() => createMessages(100));
  return <Mailbox id='story' messages={messages} ignoreAttention />;
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-inbox/Mailbox',
  component: Mailbox,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;
