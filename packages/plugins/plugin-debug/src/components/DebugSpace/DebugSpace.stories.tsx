//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect } from 'react';

import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { render, withLayout, withTheme } from '@dxos/storybook-utils';

import { DebugSpace } from './DebugSpace';

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

  return <DebugSpace space={space} />;
};

const meta: Meta = {
  title: 'plugins/plugin-debug/DebugSpace',
  component: DebugSpace,
  render: render(DefaultStory),
  decorators: [withClientProvider({ createSpace: true }), withLayout({ tooltips: true }), withTheme],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const Default = {};
