//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { DataType } from '@dxos/schema';
import { type ValueGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme, render } from '@dxos/storybook-utils';

import { D3ForceGraph } from './D3ForceGraph';
import { generate } from './testing';
import { useGraphModel } from '../../hooks';
import { ViewType } from '../../types';

const generator = faker as any as ValueGenerator;

faker.seed(1);

const DefaultStory = () => {
  const client = useClient();
  const [space, setSpace] = useState<Space>();
  const [view, setView] = useState<ViewType>();
  useEffect(() => {
    const space = client.spaces.default;
    void generate(space, generator);
    const view = space.db.add(Obj.make(ViewType, { name: '', type: '' }));
    setSpace(space);
    setView(view);
  }, []);

  const model = useGraphModel(space);
  if (!model || !space || !view) {
    return null;
  }

  return <D3ForceGraph model={model} />;
};

const meta: Meta = {
  title: 'plugins/plugin-explorer/D3ForceGraph',
  component: D3ForceGraph,
  render: render(DefaultStory),
  decorators: [
    withClientProvider({
      createSpace: true,
      types: [ViewType, DataType.Organization, DataType.Project, DataType.Person, DataType.HasRelationship],
    }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
};

export default meta;

export const Default = {};
