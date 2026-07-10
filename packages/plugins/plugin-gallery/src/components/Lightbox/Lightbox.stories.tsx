//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Blob, Ref } from '@dxos/echo';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Panel, Toolbar } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { File } from '@dxos/types';

import { translations } from '#translations';

import { Lightbox } from './Lightbox';

// Picsum returns a random image at the requested size for each unique seed.
const SEEDS: ReadonlyArray<{ seed: string; w: number; h: number }> = [
  { seed: 'alpha', w: 600, h: 400 },
  { seed: 'bravo', w: 500, h: 700 },
  { seed: 'charlie', w: 800, h: 500 },
  { seed: 'delta', w: 600, h: 600 },
  { seed: 'echo', w: 700, h: 480 },
  { seed: 'foxtrot', w: 500, h: 750 },
  { seed: 'golf', w: 640, h: 360 },
  { seed: 'hotel', w: 540, h: 720 },
  { seed: 'india', w: 600, h: 450 },
  { seed: 'juliet', w: 480, h: 640 },
  { seed: 'kilo', w: 700, h: 700 },
  { seed: 'lima', w: 800, h: 450 },
];

// The core Blob API ships no `https:` scheme handler (every core blob has managed, readable
// bytes) — this story registers a minimal passthrough backend so mock external image URLs
// resolve, exactly the extension point the API leaves open for a future web-link backend.
const HTTP_STORAGE = 'http-passthrough';

type StoryArgs = {
  imageCount: number;
  enableDelete?: boolean;
};

const DefaultStory = ({ imageCount, enableDelete }: StoryArgs) => {
  const spaces = useSpaces();
  const space = spaces[0];
  const [images, setImages] = useState<ReadonlyArray<Ref.Ref<File.File>> | undefined>(undefined);

  useEffect(() => {
    if (!space) {
      return;
    }

    const cleanup = space.db.graph.registerBlobBackend(HTTP_STORAGE, {
      schemes: ['https'],
      put: async () => {
        throw new Error(`${HTTP_STORAGE} is read-only`);
      },
      get: async () => undefined,
      has: async () => false,
      getUrl: async ({ uri }) => uri,
    });

    const refs = SEEDS.slice(0, imageCount).map(({ seed, w, h }) => {
      const url = `https://picsum.photos/seed/${seed}/${w}/${h}`;
      const blob = space.db.add(Blob.make({ type: 'image/jpeg', size: 0, data: Blob.externalData(url) }));
      const file = space.db.add(File.make({ name: `${seed}.jpg`, data: Ref.make(blob) }));
      return Ref.make(file);
    });
    setImages(refs);

    return cleanup;
  }, [space, imageCount]);

  if (!images) {
    return <Loading />;
  }

  const gallery = { name: 'Sample Gallery', images };

  return (
    <Lightbox.Root
      gallery={gallery}
      onDelete={enableDelete ? (index) => setImages((prev) => prev?.filter((_, i) => i !== index)) : undefined}
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
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({ capabilities: [] }),
    withClientProvider({ createIdentity: true, createSpace: true, types: [File.File, Blob.Blob] }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    imageCount: SEEDS.length,
    enableDelete: true,
  },
};

export const Empty: Story = {
  args: {
    imageCount: 0,
    enableDelete: true,
  },
};

export const ReadOnly: Story = {
  args: {
    imageCount: SEEDS.length,
    enableDelete: false,
  },
};
