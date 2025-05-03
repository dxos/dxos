//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';
import { type Meta } from '@storybook/react';
import React from 'react';

import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { Popover } from '@dxos/react-ui';
import { Testing } from '@dxos/schema/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { OrgCard, type OrgCardProps } from './components';
import translations from './translations';

faker.seed(1234);

const meta: Meta<OrgCardProps> = {
  title: 'plugins/plugin-preview/Preview',
  render: (args: OrgCardProps) => {
    return (
      <Popover.Root open>
        <Popover.Content classNames='popover-max-width overflow-hidden'>
          <OrgCard {...args} />
          <Popover.Arrow />
        </Popover.Content>
        <Popover.Trigger>Org</Popover.Trigger>
      </Popover.Root>
    );
  },
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;

export const Org = {
  args: {
    subject: create(Testing.Org, {
      name: faker.company.name(),
      image:
        'https://images.unsplash.com/photo-1554629947-334ff61d85dc?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1024&h=1280&q=80',
      website: faker.internet.url(),
      description: faker.lorem.paragraph(),
    }),
  },
};

export const OrgNoImage = {
  args: {
    subject: create(Testing.Org, {
      name: faker.company.name(),
      website: faker.internet.url(),
      description: faker.lorem.paragraph(),
    }),
  },
};
