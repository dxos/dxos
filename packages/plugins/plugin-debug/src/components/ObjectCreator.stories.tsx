//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { type FC, useEffect } from 'react';

import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { type ReactiveObject, useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { ObjectCreator, type ObjectCreatorProps } from './ObjectCreator';

const render =
  <T,>(r: FC<T>) =>
  (args: T) => <>{r(args) ?? <div />}</>;

const DefaultStory = () => {
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

const meta: Meta = {
  title: 'plugins/plugin-debug/SchemaList',
  component: ObjectCreator,
  render: render(DefaultStory),
  decorators: [withClientProvider({ createSpace: true }), withTheme],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const Default = {};
