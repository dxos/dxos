//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import CHESS_1_MDL from '../../../docs/examples/chess-1.mdl?raw';

import { translations } from '../../translations';
import { DeusArticle } from './DeusArticle';

import { Spec } from '#types';

const DefaultStory = ({ content }: { content?: string }) => {
  const spaces = useSpaces();
  const space = spaces[0];
  const [spec, setSpec] = useState<Spec.Spec | undefined>();

  useEffect(() => {
    if (space && !spec) {
      setSpec(space.db.add(Spec.make({ content })));
    }
  }, [space]);

  if (!spec) {
    return <Loading />;
  }

  return <DeusArticle role='article' subject={spec} />;
};

const meta = {
  title: 'plugins/plugin-deus/containers/DeusArticle',
  render: (args: { content?: string }) => <DefaultStory {...args} />,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true, types: [Spec.Spec] }),
    withTheme(),
    withLayout({ layout: 'column', classNames: 'w-[50rem]' }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Default: Story = {};

export const Chess: Story = {
  args: {
    content: CHESS_1_MDL,
  },
};
