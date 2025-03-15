//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-hooks';
import { render, withLayout, withTheme } from '@dxos/storybook-utils';

import { DebugSpace } from './DebugSpace';

const DefaultStory = () => {
  const [space] = useSpaces();
  useAsyncEffect(async () => {
    if (space) {
      const generator = createSpaceObjectGenerator(space);
      await generator.addSchemas();
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
