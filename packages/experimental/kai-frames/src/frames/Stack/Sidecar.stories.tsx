//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React from 'react';

import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { Sidecar, Section, SidecarStack } from './Sidecar';
import { StackFrameRuntime } from './defs';
import { TestFrameContainer } from '../../testing';

import '@dxosTheme';

const actions = ['summarize', 'translate', 'list people', 'convert to records', 'shorten', 'extend'];

const sections: Section[] = Array.from({ length: 16 }).map(() => ({
  text: faker.lorem.sentences(2 + faker.number.int(4)),
  actions: faker.helpers.arrayElements(actions, faker.number.int(3)),
}));

export default {
  component: Sidecar,
  parameters: {
    layout: 'fullscreen',
  },
};

// TODO(burdon): Decorator to enable bots to auto-join (fixed topic).

export const Default = {
  decorators: [ClientSpaceDecorator()],
  render: () => (
    <TestFrameContainer onCreate={StackFrameRuntime.onCreate!} slots={{ root: { className: 'w-[500px]' } }}>
      <SidecarStack sections={sections} />
    </TestFrameContainer>
  ),
};
