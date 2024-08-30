//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useEffect } from 'react';

import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { type ReactiveObject, useSpaces } from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';

import { ObjectCreator } from './ObjectCreator';

const Story: FC = () => {
  const [space] = useSpaces();
  useEffect(() => {
    if (space) {
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
    }
  }, [space]);

  const handleCreate = (objects: ReactiveObject<any>[]) => {
    console.log('Created:', objects);
  };

  if (!space) {
    return null;
  }

  return <ObjectCreator space={space} onAddObjects={handleCreate} />;
};

export default {
  title: 'plugin-debug/SchemaList',
  component: ObjectCreator,
  render: () => <ClientRepeater component={Story} createSpace />,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
