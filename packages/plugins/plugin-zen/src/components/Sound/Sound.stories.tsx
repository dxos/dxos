//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Sequence } from '#types';

import { Sound } from './Sound';

const SampleStory = () => {
  const [sequence, setSequence] = useState(Sequence.makeSampleSequence('rain'));
  return <Sound sequence={sequence} onUpdate={setSequence} />;
};

const GeneratorStory = () => {
  const [sequence, setSequence] = useState(Sequence.makeGeneratorSequence());
  return <Sound sequence={sequence} onUpdate={setSequence} />;
};

const meta = {
  title: 'plugins/plugin-zen/components/Sound',
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Sample: Story = {
  render: () => <SampleStory />,
};

export const Generator: Story = {
  render: () => <GeneratorStory />,
};
