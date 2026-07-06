//
// Copyright 2026 DXOS.org
//

/**
 * Placeholder pipeline column: composed stages in execution order plus the latest raw output.
 * `Default` shows an idle two-stage pipeline with output; `Running` marks a stage active.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { PipelinePanel } from './PipelinePanel';

const meta = {
  title: 'stories/stories-brain/components/PipelinePanel',
  component: PipelinePanel,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof PipelinePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

const STAGES = [
  { id: 'extract-facts', description: 'LLM proposition extraction (pipeline-rdf)' },
  { id: 'index-facts', description: 'Persist facts into the semantic store' },
];

export const Default: Story = {
  args: {
    stages: STAGES,
    output: [{ source: 'editor:document', facts: 3 }],
  },
};

export const Running: Story = {
  args: {
    stages: STAGES,
    active: 'extract-facts',
  },
};
