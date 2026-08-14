//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { useOptionalCapability } from '@dxos/app-framework/ui';
import { Button } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TerraPlugin } from '#plugin';
import { translations } from '#translations';
import { Terra, TerraCapabilities } from '#types';

import { STORY_ATTENDABLE_ID, withAttention } from '../../testing';
import { TerraArticle } from './TerraArticle';

type StoryArgs = Partial<Terra.TerraConfig>;

const DefaultStory = (props: StoryArgs) => {
  const terra = useMemo(
    () =>
      Terra.make({
        config: props,
      }),
    [props],
  );

  return <TerraArticle subject={terra} attendableId={STORY_ATTENDABLE_ID} role='article' />;
};

const meta = {
  title: 'plugins/plugin-terra/containers/TerraArticle',
  component: DefaultStory,
  decorators: [withTheme(), withAttention(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// A bare manager, not `TerraPlugin()`: these stories exercise TerraArticle's fallback cache, which
// only runs while the PlanetCache capability is unregistered.
export const Default: Story = {
  decorators: [withPluginManager()],
};

export const Hires: Story = {
  args: {
    resolution: 512,
    seed: 'terra-4',
  },
  decorators: [withPluginManager()],
};

const ObjectsStory = () => {
  const terra = useMemo(() => Terra.makeDemoWorld({ config: { seed: 'terra-4', resolution: 128 } }), []);
  return <TerraArticle subject={terra} attendableId={STORY_ATTENDABLE_ID} role='article' />;
};

export const Objects: Story = {
  render: () => <ObjectsStory />,
  decorators: [withPluginManager()],
};

const CachedStory = () => {
  const terra = useMemo(() => Terra.make({ config: { seed: 'terra-cache', resolution: 192 } }), []);
  const cache = useOptionalCapability(TerraCapabilities.PlanetCache);
  const [mounted, setMounted] = useState(true);

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex items-center gap-2 p-2'>
        <Button data-testid='terra.story.toggle' onClick={() => setMounted((mounted) => !mounted)}>
          {mounted ? 'Unmount' : 'Mount'}
        </Button>
        <span data-testid='terra.story.stats'>{`hits=${cache?.hits ?? 0} misses=${cache?.misses ?? 0}`}</span>
      </div>
      {mounted && <TerraArticle subject={terra} attendableId={STORY_ATTENDABLE_ID} role='article' />}
    </div>
  );
};

/**
 * The plugin-owned planet cache outliving the article, which is what makes a remount (resize,
 * companion, navigation) cheap.
 *
 * Test:
 * 1. Wait for the planet to appear; the readout still shows `hits=0 misses=0` (it only re-renders on click).
 * 2. Click `Unmount`: the readout shows `misses=1` — the first mount generated one planet.
 * 3. Click `Mount`: the planet appears immediately, with no multi-second stall.
 * 4. Click `Unmount` again: the readout shows `hits=1 misses=1` — the remount generated nothing.
 */
export const CachedManual: Story = {
  render: () => <CachedStory />,
  decorators: [withPluginManager({ plugins: [TerraPlugin()] })],
};
