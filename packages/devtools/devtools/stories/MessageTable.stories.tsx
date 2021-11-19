//
// Copyright 2020 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { randomBytes } from '@dxos/crypto';
import { IFeedGenericBlock } from '@dxos/echo-protocol';
import { FullScreen } from '@dxos/react-components';

import { MessageTable } from '../src';

export default {
  title: 'devtools/MessageTable'
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
  const messages: IFeedGenericBlock<any>[] = [...new Array(20)].map((_, i) => ({
    key: randomBytes(),
    seq: i,
    sync: true,
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
