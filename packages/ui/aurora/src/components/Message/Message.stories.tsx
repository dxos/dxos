//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { Info } from '@phosphor-icons/react';
import React from 'react';

import { MessageValence } from '@dxos/aurora-types';

import { Message, MessageBody, MessageTitle } from './Message';

type StoryMessageProps = {
  valence: MessageValence;
  title: string;
  body: string;
};

const StoryMessage = ({ valence, title, body }: StoryMessageProps) => (
  <Message valence={valence}>
    <MessageTitle>
      <Info className='inline w-5 h-5 mb-1' weight='duotone' /> {title}
    </MessageTitle>
    <MessageBody>{body}</MessageBody>
  </Message>
);

export default {
  component: StoryMessage,
};

export const Default = {
  args: {
    valence: 'error',
    title: 'Alert title',
    body: 'Alert content',
  },
};
