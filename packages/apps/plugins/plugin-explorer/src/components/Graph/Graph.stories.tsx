//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { View as ViewType, types } from '@braneframe/types/proto';
import { createSpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
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
    generator.createObjects({ [TestSchemaType.organization]: 20, [TestSchemaType.contact]: 50 });

    const view = space.db.add(new ViewType({}));

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
  render: () => <ClientRepeater component={Story} createSpace types={types} />,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
