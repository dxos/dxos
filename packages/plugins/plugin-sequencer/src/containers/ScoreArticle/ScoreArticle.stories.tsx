//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Note, Score, Sequence, Track } from '#types';

import { type MutableScore, applyLeadSheetToScore } from '../../util';
import { parseLeadSheet } from '../../util/lead-sheet';
import { ScoreArticle } from './ScoreArticle';
import CHILDREN from './testing/children.txt?raw';
import ODE_TO_JOY from './testing/ode_to_joy.txt?raw';
type Pattern = {
  tracks: Track.Track[];
  sequences: Sequence.Sequence[];
};

const SAMPLE_PATTERN: Pattern = {
  tracks: [
    { id: 't1', name: 'Lead' },
    { id: 't2', name: 'Bass' },
    { id: 't3', name: 'Pad' },
    { id: 't4', name: 'Drums' },
  ],
  sequences: [
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
    {
      id: 's3',
      trackId: 't3',
      name: 'Pad',
      length: 16,
      notes: [],
    },
    {
      id: 's4',
      trackId: 't4',
      name: 'Drums',
      length: 16,
      notes: [],
    },
  ],
};

type StoryArgs = {
  /** Lead-sheet text — when set, parsed and applied via applyLeadSheetToScore. */
  text?: string;
  /** Plain pattern (tracks + sequences) used when `text` is not provided. */
  pattern?: Pattern;
};

const buildScore = ({ text, pattern }: StoryArgs): Score.Score => {
  if (text) {
    const score = Score.make({ name: 'Score', tempo: 120, timeSignature: '4/4' });
    const document = parseLeadSheet(text, { beatsPerBar: 4 });
    Obj.update(score, (score) => {
      applyLeadSheetToScore(score as unknown as MutableScore, document);
    });
    return score;
  }
  const { tracks = [], sequences = [] } = pattern ?? {};
  return Score.make({ name: 'Score', tempo: 120, tracks, sequences });
};

const DefaultStory = (args: StoryArgs) => {
  const score = useMemo(() => buildScore(args), [args]);
  return <ScoreArticle role='article' attendableId='story-score' subject={score} />;
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

export const Default: Story = {
  args: {
    pattern: SAMPLE_PATTERN,
  },
};

export const OdeToJoy: Story = {
  args: {
    text: ODE_TO_JOY,
  },
};

export const Children: Story = {
  args: {
    text: CHILDREN,
  },
};
