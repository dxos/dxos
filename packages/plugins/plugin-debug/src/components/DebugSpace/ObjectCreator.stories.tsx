//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect } from 'react';

import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { log } from '@dxos/log';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { render, withLayout, withTheme } from '@dxos/storybook-utils';

import { ObjectCreator, type ObjectCreatorProps } from './ObjectCreator';

const DefaultStory = () => {
  const [space] = useSpaces();
  useEffect(() => {
    if (space) {
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
    }
  }, [space]);

  const handleCreate: ObjectCreatorProps['onAddObjects'] = (objects) => {
    log.info('created', { objects });
  };

  if (!space) {
    return null;
  }

  return <ObjectCreator space={space} onAddObjects={handleCreate} />;
};

const meta: Meta = {
  title: 'plugins/plugin-debug/ObjectCreator',
  component: ObjectCreator,
  render: render(DefaultStory),
  decorators: [withClientProvider({ createSpace: true }), withLayout({ tooltips: true }), withTheme],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const Default = {};
