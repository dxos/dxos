//
// Copyright 2020 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { FeedBlock } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { FullScreen } from '@dxos/react-components';

import { MessageTable } from './MessageTable';

export default {
  title: 'MessageTable'
};

// TODO(burdon): Generate protos.
const generateTree = (node = {}, level = 1) => {
  if (level > 0) {
    [...new Array(1 + Math.floor(Math.random() * 5))].forEach(() => {
      (node as any)[faker.lorem.word()] = Math.random() > 0.5 ? Boolean(Math.random() > 0.5)
        : (level - 1) > 0 ? generateTree({}, level - 1) : faker.lorem.word();
    });
  }

  return node;
};

export const Primary = () => {
  // TODO(burdon): Factor out.
  const messages: FeedBlock<any>[] = [...new Array(20)].map((_, i) => ({
    key: PublicKey.random(),
    seq: i,
    fn: true,
    path: '',
    data: generateTree({}, 3)
  }));

  return (
    <FullScreen>
      <MessageTable
        messages={messages}
      />
    </FullScreen>
  );
};
