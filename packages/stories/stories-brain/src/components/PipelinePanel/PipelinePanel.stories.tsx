//
// Copyright 2026 DXOS.org
//

/**
 * Pipeline column: a toolbar picker selects the pipeline; the body lists that pipeline's fixed,
 * read-only stages (disabled stages dimmed). `Running` shows the toolbar busy spinner.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type PipelineInfo, PipelinePanel, type PipelinePanelProps } from './PipelinePanel';

const PIPELINES: PipelineInfo[] = [
  {
    id: 'facts',
    label: 'Facts (RDF)',
    stages: [
      { id: 'extract-facts', description: 'LLM proposition extraction (pipeline-rdf)', enabled: true },
      { id: 'normalize-predicates', description: 'Canonicalize predicate synonyms', enabled: true },
    ],
  },
  {
    id: 'transcription',
    label: 'Transcription',
    stages: [
      { id: 'correction', description: 'Correct transcript text', enabled: true },
      { id: 'summarization', description: 'Summarize the transcript', enabled: true },
      { id: 'extraction', description: 'Extract structured items', enabled: false },
    ],
  },
];

const DefaultStory = (props: Omit<PipelinePanelProps, 'selected' | 'onSelect'>) => {
  const [selected, setSelected] = useState(PIPELINES[0].id);
  return <PipelinePanel {...props} selected={selected} onSelect={setSelected} />;
};

const meta = {
  title: 'stories/stories-brain/components/PipelinePanel',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pipelines: PIPELINES,
  },
};

export const Running: Story = {
  args: {
    pipelines: PIPELINES,
    busy: true,
  },
};
