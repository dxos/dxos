//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { ViewType } from '@braneframe/types';
import { createSpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { ClientRepeater, FullscreenDecorator } from '@dxos/react-client/testing';

import { Graph } from './Graph';

faker.seed(1);

const Story = () => {
  const client = useClient();
  const [space, setSpace] = useState<Space>();
  const [view, setView] = useState<ViewType>();
  useEffect(() => {
    const space = client.spaces.default;

    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();
    void generator.createObjects({ [TestSchemaType.organization]: 20, [TestSchemaType.contact]: 50 }).catch();

    const view = space.db.add(create(ViewType, { name: '', type: '' }));

    setSpace(space);
    setView(view);
  }, []);

  if (!space || !view) {
    return null;
  }

  return <Graph space={space} />;
};

export default {
  title: 'plugin-explorer/Graph',
  component: Graph,
  render: () => <ClientRepeater component={Story} createSpace types={[ViewType]} />,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
