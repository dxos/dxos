//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef, useState } from 'react';

import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Next } from '@dxos/react-ui/next';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Model, Scene } from '#types';

import { type SpacetimeController, SpacetimeEditor } from './SpacetimeEditor.tsx';

const DefaultStory = () => {
  const controller = useRef<SpacetimeController>(null);
  const spaces = useSpaces();
  const space = spaces[0];
  const [scene, setScene] = useState<Scene.Scene | undefined>();
  useEffect(() => {
    if (space && !scene) {
      setScene(space.db.add(Scene.make({ name: 'Test Scene' })));
    }
  }, [space, scene]);

  if (!scene) {
    return <Loading />;
  }

  return (
    <SpacetimeEditor.Root ref={controller} scene={scene}>
      <Next.Panel.Root>
        <Next.Panel.Header>
          <SpacetimeEditor.Toolbar alwaysActive />
        </Next.Panel.Header>
        <Next.Panel.Body asChild>
          <SpacetimeEditor.Canvas />
        </Next.Panel.Body>
      </Next.Panel.Root>
    </SpacetimeEditor.Root>
  );
};

const meta = {
  title: 'plugins/plugin-spacetime/components/SpacetimeEditor',
  render: DefaultStory,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true, types: [Scene.Scene, Model.Object] }),
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Default: Story = {};
