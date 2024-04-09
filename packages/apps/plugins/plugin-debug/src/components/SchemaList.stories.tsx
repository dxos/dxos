//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useEffect } from 'react';

import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { useSpaces } from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';

import { SchemaList } from './SchemaList';

const Story: FC = () => {
  const [space] = useSpaces();
  useEffect(() => {
    if (space) {
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
    }
  }, [space]);

  const handleCreate = (schema: any /*Schema */, count: number) => {
    console.log(schema.id, count);
  };

  if (!space) {
    return null;
  }

  return <SchemaList space={space} onCreate={handleCreate} />;
};

export default {
  title: 'plugin-debug/SchemaList',
  component: SchemaList,
  render: () => <ClientRepeater component={Story} createSpace />,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
