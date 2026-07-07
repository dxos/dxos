//
// Copyright 2026 DXOS.org
//

/**
 * Markdown editor column with POS decorations (offline stub tagger) and a pipeline-trigger toolbar
 * button. `Default` logs the current text via the Storybook action; purely presentational.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { stubParse } from '@dxos/nlp/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { DocumentEditor } from './DocumentEditor';

const meta = {
  title: 'stories/stories-brain/components/DocumentEditor',
  component: DocumentEditor,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof DocumentEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialValue: trim`
      # Document

      The quick brown fox jumps over the lazy dog.
    `,
    parse: stubParse,
    onRun: console.log,
  },
};
