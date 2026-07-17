//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DiffView } from './DiffView';

const before = [
  '# Project Plan',
  '',
  'The project will deliver a collaborative editor built on CRDTs.',
  '',
  'Revisions merge automatically without conflicts.',
  '',
  '## Timeline',
  '',
  'Q3: prototype.',
  'Q4: beta.',
].join('\n');

const after = [
  '# Project Plan',
  '',
  'The project delivers a collaborative editor built on CRDTs.',
  'Each document tracks named checkpoints that any peer can restore.',
  '',
  'Revisions merge automatically with deterministic conflict resolution.',
  '',
  '## Timeline',
  '',
  'Q3: prototype.',
  'Q4: beta.',
].join('\n');

const meta = {
  title: 'plugins/plugin-markdown/containers/DiffView',
  component: DiffView,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DiffView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    before,
    after,
  },
};
