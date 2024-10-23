//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect } from 'react';

import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { type ReactiveObject, useSpaces } from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';

import { ObjectCreator, type ObjectCreatorProps } from './ObjectCreator';

const Story = () => {
  const [space] = useSpaces();
  useEffect(() => {
    if (space) {
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
    }
  }, [space]);

  if (!space) {
    return null;
  }

  const handleCreate: ObjectCreatorProps['onAddObjects'] = (objects: ReactiveObject<any>[]) => {
    console.log('Created:', objects);
  };

  return <ObjectCreator space={space} onAddObjects={handleCreate} />;
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-debug/SchemaList',
  component: ObjectCreator,
  render: () => <ClientRepeater component={Story} createSpace />,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
