//
// Copyright 2026 DXOS.org
//

/**
 * Placeholder pipeline column: stages are toggleable (checkbox) and re-orderable (drag handle),
 * with the latest raw output below. `Default` is interactive; `Running` marks a stage active.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { PipelinePanel, type PipelinePanelProps, type StageInfo } from './PipelinePanel';

const STAGES: StageInfo[] = [
  { id: 'extract-facts', description: 'LLM proposition extraction (pipeline-rdf)', enabled: true },
  { id: 'index-facts', description: 'Persist facts into the semantic store', enabled: false },
];

const DefaultStory = (props: PipelinePanelProps) => {
  const [stages, setStages] = useState<StageInfo[]>(props.stages);
  return <PipelinePanel {...props} stages={stages} onStagesChanged={setStages} />;
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
    stages: STAGES,
    output: [{ source: 'editor:document', facts: 3 }],
  },
};

export const Running: Story = {
  args: {
    stages: STAGES,
    busy: true,
  },
};
