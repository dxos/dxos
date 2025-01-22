//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { render, withLayout, withTheme } from '@dxos/storybook-utils';

import { SpaceGenerator } from './SpaceGenerator';

const DefaultStory = () => {
  const [space] = useSpaces();
  if (!space) {
    return null;
  }

  return <SpaceGenerator space={space} />;
};

const meta: Meta = {
  title: 'plugins/plugin-debug/SpaceGenerator',
  component: SpaceGenerator,
  render: render(DefaultStory),
  decorators: [withClientProvider({ createSpace: true }), withLayout({ tooltips: true }), withTheme],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const Default = {};
