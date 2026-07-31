//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Map } from '#types';

import { viewMarkerProvider } from '../../capabilities/marker-provider';
import { MapArticle } from './MapArticle';

type StoryArgs = {};

const DefaultStory = (_: StoryArgs) => {
  const map = useMemo(() => Map.make({ name: 'Story map' }), []);
  return <MapArticle role='article' attendableId='story' subject={map} provider={viewMarkerProvider} />;
};

const meta = {
  title: 'plugins/plugin-map/containers/MapArticle',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withClientProvider({ createIdentity: true })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
