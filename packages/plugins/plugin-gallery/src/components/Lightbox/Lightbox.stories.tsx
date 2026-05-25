//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Ref } from '@dxos/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { File } from '@dxos/types';

import { translations } from '#translations';

import { Lightbox } from './Lightbox';

// Picsum returns a random image at the requested size for each unique seed.
const mockFileRef = (seed: string, w: number, h: number): Ref.Ref<File.File> => {
  const url = `https://picsum.photos/seed/${seed}/${w}/${h}`;
  const obj = File.make({
    name: `${seed}.jpg`,
    type: 'image/jpeg',
    size: 0,
    data: File.externalData(url),
  });
  return Ref.make(obj);
};

const SAMPLE_FILES: ReadonlyArray<Ref.Ref<File.File>> = [
  mockFileRef('alpha', 600, 400),
  mockFileRef('bravo', 500, 700),
  mockFileRef('charlie', 800, 500),
  mockFileRef('delta', 600, 600),
  mockFileRef('echo', 700, 480),
  mockFileRef('foxtrot', 500, 750),
  mockFileRef('golf', 640, 360),
  mockFileRef('hotel', 540, 720),
  mockFileRef('india', 600, 450),
  mockFileRef('juliet', 480, 640),
  mockFileRef('kilo', 700, 700),
  mockFileRef('lima', 800, 450),
];

type DefaultStoryProps = {
  initialFiles: ReadonlyArray<Ref.Ref<File.File>>;
  enableDelete?: boolean;
};

const DefaultStory = ({ initialFiles, enableDelete }: DefaultStoryProps) => {
  const [images, setImages] = useState<ReadonlyArray<Ref.Ref<File.File>>>(initialFiles);
  const gallery = { name: 'Sample Gallery', images };

  return (
    <Lightbox.Root
      gallery={gallery}
      onDelete={enableDelete ? (index) => setImages((prev) => prev.filter((_, i) => i !== index)) : undefined}
    >
      <Panel.Root role='article'>
        <Panel.Toolbar>
          <Toolbar.Root>
            <Toolbar.Button>Add image</Toolbar.Button>
            <Toolbar.Button>Show</Toolbar.Button>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Lightbox.Viewport />
        </Panel.Content>
      </Panel.Root>
    </Lightbox.Root>
  );
};

const meta = {
  title: 'plugins/plugin-gallery/components/Lightbox',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withPluginManager({ capabilities: [] })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialFiles: SAMPLE_FILES,
    enableDelete: true,
  },
};

export const Empty: Story = {
  args: {
    initialFiles: [],
    enableDelete: true,
  },
};

export const ReadOnly: Story = {
  args: {
    initialFiles: SAMPLE_FILES,
    enableDelete: false,
  },
};
