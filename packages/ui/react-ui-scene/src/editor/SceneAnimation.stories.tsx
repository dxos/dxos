//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useLayoutEffect } from 'react';

import { SceneEditor, useSceneEditor } from '@dxos/react-ui-canvas';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type Scene } from '@dxos/scene';

import { DOCUMENT_2D, DOCUMENT_3D, SceneEditorStory, SHOTS_2D, SHOTS_3D } from '../testing/index.ts';

type StoryProps = {
  dim: Scene.Dimension;
  /** Plays from the start, round and round. */
  playing?: boolean;
  /** Where the playhead rests when not playing (seconds). */
  time?: number;
};

/** Starts the shot playing (again each time it ends) or parks the playhead at `time`. */
const Playback = ({ playing, time = 0 }: Pick<StoryProps, 'playing' | 'time'>) => {
  const { store, shots } = useSceneEditor('SceneAnimation.Playback');
  const duration = shots?.[0]?.timeline.duration ?? 0;
  useLayoutEffect(() => {
    store.setTime(playing ? 0 : time);
    store.setPlaying(Boolean(playing));
  }, [store, playing, time]);
  useEffect(() => {
    if (!playing || duration <= 0) {
      return;
    }
    const interval = setInterval(
      () => {
        store.setTime(0);
        store.setPlaying(true);
      },
      duration * 1000 + 500,
    );
    return () => clearInterval(interval);
  }, [store, playing, duration]);
  return null;
};

/** The Timeline panel over an animator shot, playing or scrubbed, in either dimension. */
const DefaultStory = ({ dim, playing, time }: StoryProps) => (
  <SceneEditorStory
    document={dim === '3d' ? DOCUMENT_3D : DOCUMENT_2D}
    select={dim === '3d' ? ['hub'] : ['a']}
    shots={dim === '3d' ? SHOTS_3D : SHOTS_2D}
  >
    <Playback playing={playing} time={time} />
    <SceneEditor.Viewport>
      <SceneEditor.Tools />
      <SceneEditor.Timeline />
    </SceneEditor.Viewport>
  </SceneEditorStory>
);

const meta = {
  title: 'ui/react-ui-scene/editor/Animation',
  component: DefaultStory,
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
  argTypes: {
    dim: { control: 'inline-radio', options: ['2d', '3d'] },
    time: { control: { type: 'range', min: 0, max: 4, step: 0.1 } },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { dim: '2d' } };

export const Playing2D: Story = { args: { dim: '2d', playing: true } };

export const Playing3D: Story = { args: { dim: '3d', playing: true } };

export const Scrubbed2D: Story = { args: { dim: '2d', time: 2 } };

export const Scrubbed3D: Story = { args: { dim: '3d', time: 2 } };
