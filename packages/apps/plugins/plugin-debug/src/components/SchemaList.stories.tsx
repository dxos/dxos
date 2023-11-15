//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useEffect } from 'react';

import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { type Schema } from '@dxos/echo-schema';
import { useSpaces } from '@dxos/react-client/echo';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { SchemaList } from './SchemaList';

const Story: FC = () => {
  const [space] = useSpaces();
  useEffect(() => {
    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();
  }, [space]);

  const handleCreate = (schema: Schema, count: number) => {
    console.log(schema.id, count);
  };

  return <SchemaList space={space} onCreate={handleCreate} />;
};

export default {
  component: SchemaList,
  render: Story,
  decorators: [ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
