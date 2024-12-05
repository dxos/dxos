//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { createSpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { create } from '@dxos/react-client/echo';
import { type Space } from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Graph } from './Graph';
import { ViewType } from '../../types';

faker.seed(1);

const Story = () => {
  const client = useClient();
  const [space, setSpace] = useState<Space>();
  const [view, setView] = useState<ViewType>();
  useEffect(() => {
    const space = client.spaces.default;
    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();
    void generator
      .createObjects({
        [TestSchemaType.organization]: 20,
        [TestSchemaType.contact]: 50,
      })
      .catch(() => {});

    const view = space.db.add(create(ViewType, { name: '', type: '' }));
    setSpace(space);
    setView(view);
  }, []);

  if (!space || !view) {
    return null;
  }

  return <Graph space={space} />;
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-explorer/Graph',
  component: Graph,
  render: () => <ClientRepeater component={Story} createSpace types={[ViewType]} />,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
