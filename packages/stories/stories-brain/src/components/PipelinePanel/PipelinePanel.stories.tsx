//
// Copyright 2026 DXOS.org
//

/**
 * Pipeline column: a fixed, read-only list of the composed stages (configured by the story) with the
 * latest raw output below. `Default` shows an idle pipeline with output; `Running` shows the toolbar
 * busy spinner. Disabled stages render dimmed.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { PipelinePanel, type StageInfo } from './PipelinePanel';

const STAGES: StageInfo[] = [
  { id: 'extract-facts', description: 'LLM proposition extraction (pipeline-rdf)', enabled: true },
  { id: 'index-facts', description: 'Persist facts into the semantic store', enabled: false },
];

const meta = {
  title: 'stories/stories-brain/components/PipelinePanel',
  component: PipelinePanel,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof PipelinePanel>;

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
