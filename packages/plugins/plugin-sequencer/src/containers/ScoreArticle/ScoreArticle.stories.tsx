//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Note, Sequence, Score, Track } from '#types';

import { applyLeadSheetToScore, type MutableScore } from '../../util';
import { parseLeadSheet } from '../../util/lead-sheet';
import { ScoreArticle } from './ScoreArticle';
import SCORE from './testing/ode_to_joy.txt?raw';

const buildSampleScore = (): Score.Score => {
  const tracks: Track.Track[] = [
    { id: 't1', name: 'Lead', hue: 'red' },
    { id: 't2', name: 'Bass', hue: 'orange' },
    { id: 't3', name: 'Pad', hue: 'blue' },
    { id: 't4', name: 'Drums', hue: 'green' },
  ];

  const sequences: Sequence.Sequence[] = [
    {
      id: 's1',
      trackId: 't1',
      name: 'Lead — verse',
      length: 16,
      notes: [60, 62, 64, 65, 67, 69, 71, 72].map(
        (pitch, index): Note.Note => ({
          pitch,
          startTime: index * 0.5,
          duration: 0.25,
          velocity: 0.7,
        }),
      ),
    },
    {
      id: 's2',
      trackId: 't2',
      name: 'Bass — verse',
      length: 16,
      notes: [36, 36, 43, 43, 41, 41, 38, 38].map(
        (pitch, index): Note.Note => ({
          pitch,
          startTime: index,
          duration: 0.75,
          velocity: 0.8,
        }),
      ),
    },
    { id: 's3', trackId: 't3', name: 'Pad', length: 16, notes: [] },
    { id: 's4', trackId: 't4', name: 'Drums', length: 16, notes: [] },
  ];

  return Score.make({ name: 'Demo score', tempo: 120, tracks, sequences });
};

const DefaultStory = () => {
  const score = useMemo(() => buildSampleScore(), []);
  return <ScoreArticle role='article' attendableId='story-score' subject={score} />;
};

const buildOdeToJoyScore = (): Score.Score => {
  const score = Score.make({ name: 'Ode to Joy', tempo: 120, timeSignature: '4/4' });
  const document = parseLeadSheet(SCORE, { beatsPerBar: 4 });
  Obj.update(score, (score) => {
    applyLeadSheetToScore(score as unknown as MutableScore, document);
  });
  return score;
};

const OdeToJoyStory = () => {
  const score = useMemo(() => buildOdeToJoyScore(), []);
  return <ScoreArticle role='article' attendableId='story-ode-to-joy' subject={score} />;
};

const meta = {
  title: 'plugins/plugin-sequencer/containers/ScoreArticle',
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

export const OdeToJoy: Story = {
  render: () => <OdeToJoyStory />,
};
