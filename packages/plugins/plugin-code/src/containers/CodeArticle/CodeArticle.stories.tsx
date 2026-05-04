//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { CodeProject, Spec } from '#types';

import { CodeArticle } from './CodeArticle';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[0];
  const [project, setProject] = useState<CodeProject.CodeProject | undefined>();

  useEffect(() => {
    if (space && !project) {
      const spec = space.db.add(Spec.make());
      setProject(space.db.add(CodeProject.make({ name: 'Demo', spec })));
    }
  }, [space, project]);

  if (!project) {
    return <Loading />;
  }

  return <CodeArticle role='article' subject={project} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-code/containers/CodeArticle',
  render: () => <DefaultStory />,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true, types: [Spec.Spec, CodeProject.CodeProject] }),
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
